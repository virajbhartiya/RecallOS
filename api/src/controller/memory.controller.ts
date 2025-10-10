import { Request, Response, NextFunction } from "express";

const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

interface ContextData {
  source: string;
  url: string;
  title: string;
  content_snippet: string;
  timestamp: number;
}

export const captureMemory = () =>
  catchAsync(async (req: Request<{}, {}, ContextData>, res: Response, next: NextFunction) => {
    const { source, url, title, content_snippet, timestamp } = req.body;

    // Validate required fields
    if (!source || !url || !title || !content_snippet || !timestamp) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: source, url, title, content_snippet, timestamp"
      });
    }

    const memoryData = {
      source,
      url,
      title,
      content_snippet,
      timestamp,
      received_at: Date.now()
    };

    // Print formatted JSON to console
    console.log('\n=== RecallOS Memory Capture ===');
    console.log(JSON.stringify(memoryData, null, 2));
    console.log('===============================\n');

    // Send success response
    res.status(200).json({
      status: "success",
      message: "Memory captured successfully",
      data: {
        id: `memory_${timestamp}`,
        ...memoryData
      }
    });
  });
