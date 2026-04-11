import { landingPageHandler } from './mcp-server/dist/web/landing.js';

// Mock request and reply objects
const mockRequest = {
  headers: {},
  query: {},
  body: {}
};

const mockReply = {
  type: (contentType) => ({
    send: (content) => {
      console.log('Content-Type:', contentType);
      console.log('HTML Length:', content.length);
      console.log('HTML Preview:', content.substring(0, 200) + '...');
      return content;
    }
  })
};

// Test the landing page handler
landingPageHandler(mockRequest, mockReply).catch(console.error);
