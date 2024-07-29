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

### Frontend

#### Environment

- Google Chrome on macOS

#### Tool

- Custom Chrome Extension

### Data Structure

The project uses IndexedDB to store two types of data: user activities and user scores.

#### User Activities

```typescript
type UserActivity = {
  id: number; // Auto-incremented
  timestamp: number; // Unix timestamp
  type: "new_tab" | "search_page" | "visit_page";
  url?: string; // For 'search_page' and 'visit_page' events
  title?: string; // For 'search_page' and 'visit_page' events
  tabId: number;
};
```

#### User Scores

```typescript
type UserScore = {
  searchQuery: string; // Acts as the key
  score: number | null;
};
```

These structures are stored in two separate object stores within IndexedDB:

1. `userActivities`: Stores all user activities, including new tabs, search pages, and visited pages.
2. `userScores`: Stores the scores associated with each search query.

Considerations:

- Some methods are required to use some computational intensive methods.
- Consider using a service to explore the data and generate insights.

## 3. Chrome Extension Features

- Observe and record user activities (new_tab, search_page, visit_page)
- Store JSON format data in IndexedDB
- Display tracking status (active/inactive)
- Provide UI for start/stop and jump to visualization page
- Error logging in console
- Score input interface (1-5 scale) for each search query

## 4. Data Processing

- Group events into sessions based on search queries
- Calculate dwell time for clicked links
- Filter out potential accidental clicks (e.g., dwell time < 2 seconds)

## 5. Analysis Methods

### Basic Statistics

- Average searches per day
- Most common search terms
- Distribution of scores

### Advanced Analysis

- Query Refinement Analysis
- Time-of-Day Effectiveness
- Query Complexity vs. Success Rate
- Learning Curve Analysis

### NLP Techniques

- Term Frequency-Inverse Document Frequency (TF-IDF)
- Named Entity Recognition (NER)
- Query Classification
- Word Embeddings

## 6. Search Quality Measurement

- 1-5 scoring system per search session
- Define criteria for each score to maintain consistency

## 7. Visualization

- Events by time graph
- Number of links clicked vs. answered (boolean) graph
- Duration vs. quality heatmap
- Answered query text vs. unanswered query text comparison
- Answered query text vs. score analysis
- Word cloud of most successful search terms
- Learning curve graph (search effectiveness over time)

## 8. Categorization

Implement a system to categorize searches (e.g., technical, general knowledge, product search)

## 9. Optimization Strategies

- Identify patterns in successful searches
- Develop guidelines for query formulation based on analysis
- Create a system for suggesting query improvements

## 10. Privacy and Data Management

Implement secure storage and handling of personal search data

## 11. Continuous Improvement

- Regular review of collected data
- Iterative refinement of analysis methods
- Periodic reassessment of search strategies

## 12. Future Enhancements

- Machine learning model for real-time query suggestions
- Integration with other search engines for comparative analysis
- Collaborative features for sharing anonymized insights
