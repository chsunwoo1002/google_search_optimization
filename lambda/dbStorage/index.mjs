import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
  QueryCommand,
  BatchWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

const searchQueryTableName = "google-search-optimization-queries";
const userActivityTableName = "google-search-optimization-activities";
const userIdTable = "google-search-optimization-user-ids";

export const handler = async (event, context) => {
  let body;
  let statusCode = 200;
  const headers = {
    "Content-Type": "application/json",
  };

  try {
    switch (event.routeKey) {
      case "POST /userId":
        let userId;
        let userExists = true;

        while (userExists) {
          userId = uuidv4();

          const result = await dynamo.send(
            new GetCommand({
              TableName: userIdTable,
              Key: { userId: userId },
            })
          );

          if (!result.Item) {
            userExists = false;
            await dynamo.send(
              new PutCommand({
                TableName: userIdTable,
                Item: { userId: userId },
              })
            );
          }
        }

        body = { userId: userId };
        break;
      case "POST /activities/{userId}":
        const activities = JSON.parse(event.body);
        dynamo;
        const activityWrites = activities.map((activity) => ({
          PutRequest: {
            Item: {
              id: uuidv4(),
              type: activity.type,
              url: activity.url,
              title: activity.title,
              tabId: activity.tabId,
              timestamp: activity.timestamp,
              userId: activity.userId,
            },
            TableName: userActivityTableName,
          },
        }));

        await dynamo.send(
          new BatchWriteCommand({
            RequestItems: {
              [userActivityTableName]: activityWrites,
            },
          })
        );
        body = { message: `Created ${activities.length} activities` };
        break;

      case "GET /activities/{userId}":
        body = await dynamo.send(
          new ScanCommand({ TableName: userActivityTableName })
        );
        body = body.Items;
        break;

      case "POST /activity/{userId}":
        const newActivity = JSON.parse(event.body);
        await dynamo.send(
          new PutCommand({
            TableName: userActivityTableName,
            Item: {
              id: uuidv4(),
              userId: event.pathParameters.userId,
              ...newActivity,
            },
          })
        );
        body = {
          message: `Created activity for user ${event.pathParameters.userId}`,
        };
        break;
      case "GET /queries/{userId}":
        body = await dynamo.send(
          new QueryCommand({
            TableName: searchQueryTableName,
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: {
              ":userId": event.pathParameters.userId,
            },
          })
        );
        body = body.Items;
        break;
      case "POST /queries/{userId}":
        const queries = JSON.parse(event.body);
        const queryWrites = queries.map((query) => ({
          PutRequest: {
            Item: {
              id: uuidv4(),
              userId: event.pathParameters.userId,
              content: query.content,
              score: query.score || null,
              timestamp: query.timestamp,
              tabId: query.tabId,
            },
            TableName: searchQueryTableName,
          },
        }));

        await dynamo.send(
          new BatchWriteCommand({
            RequestItems: {
              [searchQueryTableName]: queryWrites,
            },
          })
        );
        body = {
          message: `Created ${queries.length} queries for user ${event.pathParameters.userId}`,
        };
        break;

      case "GET /queries/emptyScore/{userId}":
        body = await dynamo.send(
          new ScanCommand({
            TableName: searchQueryTableName,
            FilterExpression: "userId = :userId AND score = :nullScore",
            ExpressionAttributeValues: {
              ":userId": event.pathParameters.userId,
              ":nullScore": null,
            },
          })
        );
        body = body.Items;
        break;

      case "POST /query/{userId}":
        const newQuery = JSON.parse(event.body);

        // Check for existing query with the same content using ScanCommand
        const existingQuery = await dynamo.send(
          new ScanCommand({
            TableName: searchQueryTableName,
            FilterExpression: "userId = :userId AND content = :content",
            ExpressionAttributeValues: {
              ":userId": event.pathParameters.userId,
              ":content": newQuery.content,
            },
          })
        );

        if (existingQuery.Items.length === 0) {
          // No duplicate found, add the new query
          await dynamo.send(
            new PutCommand({
              TableName: searchQueryTableName,
              Item: {
                id: uuidv4(),
                userId: event.pathParameters.userId,
                content: newQuery.content,
                score: newQuery.score !== undefined ? newQuery.score : null,
                timestamp: newQuery.timestamp,
                tabId: newQuery.tabId,
              },
            })
          );
          body = {
            message: `Created query for user ${event.pathParameters.userId}`,
          };
        } else {
          // Duplicate found, return a message
          body = {
            message: `Query with the same content already exists for user ${event.pathParameters.userId}`,
          };
        }
        break;

      case "PUT /query/{userId}/{docId}":
        const { score } = JSON.parse(event.body);
        await dynamo.send(
          new UpdateCommand({
            TableName: searchQueryTableName,
            Key: {
              id: event.pathParameters.docId,
            },
            UpdateExpression: "set #score = :score",
            ExpressionAttributeNames: {
              "#score": "score",
            },
            ExpressionAttributeValues: {
              ":score": score,
            },
          })
        );
        body = {
          message: `Updated score for query ${event.pathParameters.docId} of user ${event.pathParameters.userId}`,
        };
        break;

      default:
        throw new Error(`Unsupported route: "${event.routeKey}"`);
    }
  } catch (err) {
    statusCode = 400;
    body = err.message;
  } finally {
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers,
  };
};
