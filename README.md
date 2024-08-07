# Google Search Behavior Optimization Project

## 1. Introduction

### Problem Statement

Optimize Google search efficiency by analyzing personal search behavior and outcomes.

### Goal

Develop a system to track, analyze, and improve search strategies on Google.

### Motivation

- Personal experience: Spent 5 days searching for a single error, typing hundreds of keywords without finding the answer.
- Curiosity about query formulation: Intrigued by the relationship between how search queries are formulated and the success of search outcomes.

## 2. Data Collection

### Data Structure

The project uses IndexedDB to store two types of data: user activities and user scores.

#### User Activities

```typescript
type UserActivity = {
  id: number;
  timestamp: number;
  type: "new_tab" | "search_page" | "visit_page";
  url: string;
  title: string;
  tabId: number;
};
```

#### User Scores

```typescript
type UserScore = {
  searchQuery: string;
  score: number | null;
  timestamp: number;
  tabId: number;
};
```

These structures are stored in two separate object stores within IndexedDB:

1. `userActivities`: Stores all user activities, including new tabs, search pages, and visited pages.
2. `userScores`: Stores the scores associated with each search query.

Considerations:

- Some methods are required to use some computational intensive methods.
- Consider using a service to explore the data and generate insights.

## 3. Architecture

### Frontend

- Chrome Extension
- HTML/JS for data visualization

### Backend

- API Gateway: Handles routing of requests
- Lambda (JavaScript): Manages CRUD operations
- Python Service (Lambda): Handles data processing and analysis
- S3: Stores static files (HTML, JS) for visualization

### Data Storage

- DynamoDB: Stores collected user activity data
- S3 (optional): Can be used for storing larger datasets if needed
- IndexedDB: Temporary storage in case of trasaction failure

## 4. Chrome Extension Features

- [x] Observe and record user activities (new_tab, search_page, visit_page)
- [x] Store noSQL data in DynamoDB
- [x] Display tracking status (active/inactive)
- [x] Provide UI for start/stop and jump to visualization page
- [x] Score input interface (1-5 scale) for each search query

## 5. Data Processing and Analysis

### Python Service (Lambda)

- Implemented using FastAPI for minimal HTTP request boilerplate
- Focuses on data processing and analysis logic
- Utilizes Python's rich ecosystem for LLM and ML tasks

### Key Libraries

- FastAPI: For creating the API
- Mangum: For wrapping FastAPI app to work with AWS Lambda
- Pandas: For data manipulation
- Scikit-learn: For machine learning tasks (if needed)
- NLTK or spaCy: For NLP tasks

### Analysis Methods

#### Basic Statistics

- Average searches per day
- Most common search terms
- Distribution of scores

#### Advanced Analysis

- Query Refinement Analysis
- Time-of-Day Effectiveness
- Query Complexity vs. Success Rate
- Learning Curve Analysis

#### NLP Techniques

- Term Frequency-Inverse Document Frequency (TF-IDF)
- Named Entity Recognition (NER)
- Query Classification
- Word Embeddings
- Group events into sessions based on search queries
- Calculate dwell time for clicked links
- Filter out potential accidental clicks (e.g., dwell time < 2 seconds)
- Implement a system to categorize searches (e.g., technical, general knowledge, product search)

### Visualization

- Events by time graph
- Number of links clicked vs. answered (boolean) graph
- Duration vs. quality heatmap
- Answered query text vs. unanswered query text comparison
- Answered query text vs. score analysis
- Word cloud of most successful search terms
- Learning curve graph (search effectiveness over time)

## 6. User Flow

### Tracking User Activities

1. User clicks the chrome extension on the Chrome Browser.
2. User clicks 'Start Tracking' button on the extension.

### Visualization

3. User clicks the "see stat" button on Chrome extension.
4. Chrome creates a new tab with a specific URL.
5. The URL points to an API Gateway endpoint, which serves the HTML/JS files from S3.
6. When JS is downloaded, it requests processed data from the Python service via API Gateway.
7. The Python service (Lambda function) processes the data and returns the results.
8. JS renders the processed data in the HTML.

## 7. Deployment

- Chrome Extension: Deployed to Chrome Web Store
- Frontend Files (HTML/JS): Stored in S3, configured for static website hosting
- API Gateway: Configured to route requests to appropriate Lambda functions and S3
- Lambda Functions:
  - JavaScript Lambda for CRUD operations
  - Python Lambda for data processing and analysis
- DynamoDB: Stores user activity data

## 9. Optimization Strategies

- Identify patterns in successful searches
- Develop guidelines for query formulation based on analysis
- Create a system for suggesting query improvements

## 10. Future Enhancements

- Implement more advanced ML models for query suggestions
- Expand analysis to include more search engines
- Add collaborative features for sharing insights
- Consider moving to ECS/Fargate if more complex, long-running processes are needed in the future

## 11. Development and Deployment Steps

1. Set up S3 bucket for static file hosting (HTML/JS)
2. Create Lambda functions (JS for CRUD, Python for analysis)
3. Configure API Gateway
4. Set up DynamoDB tables
5. Develop and test Chrome Extension
6. Deploy all components
7. Conduct thorough testing of the entire system

## 12. Monitoring and Maintenance

- Use AWS CloudWatch for monitoring Lambda functions and API Gateway
- Implement logging in Lambda functions for easier debugging
- Regularly review and optimize DynamoDB usage
