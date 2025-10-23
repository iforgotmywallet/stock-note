# Implementation Plan

- [x] 1. Set up chat page routing and navigation
  - Create the `/chat` route in Next.js app directory structure
  - Add chat navigation item to sidebar with appropriate icon
  - Implement basic page layout within existing app structure
  - _Requirements: 1.1, 1.3_

- [x] 2. Create API routes for chat functionality
- [x] 2.1 Implement reports listing API endpoint
  - Create `/api/chat/reports` GET endpoint to fetch user's available reports
  - Integrate with existing AgentReportsService to get user reports
  - Return formatted report list with sessionId, ticker, analysisDate, and name
  - _Requirements: 2.1, 2.2_

- [x] 2.2 Implement report content API endpoint
  - Create `/api/chat/reports/[sessionId]` GET endpoint to fetch full report content
  - Use existing AgentReportsService.getReportBySessionId method
  - Format report content for OpenAI context usage
  - _Requirements: 2.2, 2.5_

- [x] 2.3 Implement OpenAI chat API endpoint
  - Create `/api/chat` POST endpoint for handling chat messages
  - Integrate OpenAI SDK with streaming support
  - Build system prompt for financial specialization
  - Include selected reports as context in OpenAI requests
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 3. Build report selection component
- [x] 3.1 Create ReportSelector component
  - Implement component to display available reports list
  - Add multi-select functionality for report selection
  - Show selected reports with clear visual indicators
  - Include remove functionality for selected reports
  - _Requirements: 2.1, 2.3, 2.4_

- [x] 3.2 Integrate with reports API
  - Connect ReportSelector to `/api/chat/reports` endpoint
  - Handle loading states and error scenarios
  - Implement report content fetching when reports are selected
  - _Requirements: 2.2, 2.5_

- [x] 4. Implement chat interface using AI Elements
- [x] 4.1 Create ChatInterface component with AI Elements
  - Use Conversation component for main chat container
  - Implement Message components for chat message display
  - Add MessageAvatar components for user and assistant messages
  - Use ConversationEmptyState for initial empty state
  - _Requirements: 1.2, 4.1, 4.2, 4.3_

- [x] 4.2 Implement PromptInput for message sending
  - Use PromptInputTextarea for message input
  - Add PromptInputSubmit button with loading states
  - Implement PromptInputFooter for additional controls
  - Handle message submission and form validation
  - _Requirements: 3.3, 4.4, 4.5_

- [x] 4.3 Add chat message handling and state management
  - Implement message state management with React hooks
  - Handle real-time message updates from OpenAI API
  - Add loading indicators during API calls using AI Elements Loader
  - Implement error handling with toast notifications
  - _Requirements: 3.3, 3.4, 3.5_

- [x] 5. Create main chat page component
- [x] 5.1 Implement ChatPage component
  - Create main page component at `/src/app/(main)/chat/page.tsx`
  - Integrate ReportSelector and ChatInterface components
  - Implement chat context provider for state management
  - Add responsive layout for mobile and desktop
  - _Requirements: 1.1, 1.2, 4.4, 5.4_

- [x] 5.2 Add navigation integration
  - Update app sidebar to include chat navigation item
  - Add appropriate icon (MessageCircle) for chat route
  - Ensure proper navigation highlighting for active route
  - _Requirements: 1.1_

- [x] 6. Implement context building and OpenAI integration
- [x] 6.1 Create OpenAI service integration
  - Set up OpenAI SDK configuration with API key
  - Implement financial system prompt for specialized responses
  - Create context building function to format report data
  - Add streaming response handling for real-time chat
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 6.2 Add error handling and validation
  - Implement client-side error handling with toast notifications
  - Add server-side error handling for API routes
  - Validate user authentication and report ownership
  - Handle OpenAI API errors gracefully
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]\* 7. Add comprehensive testing
- [ ]\* 7.1 Write unit tests for components
  - Test ReportSelector component selection logic
  - Test ChatInterface message handling
  - Test API route handlers with mock data
  - _Requirements: All requirements_

- [ ]\* 7.2 Write integration tests
  - Test complete chat flow with report selection
  - Test OpenAI API integration with mock responses
  - Test error scenarios and recovery
  - _Requirements: All requirements_
