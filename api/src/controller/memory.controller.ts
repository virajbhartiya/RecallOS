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
  wallet_address?: string;
  full_content?: string;
  page_metadata?: {
    description?: string;
    keywords?: string;
    author?: string;
    viewport?: string;
    language?: string;
  };
  page_structure?: {
    headings: string[];
    links: string[];
    images: string[];
    forms: string[];
  };
  user_activity?: {
    scroll_position: number;
    window_size: { width: number; height: number };
    focused_element?: string;
  };
}

export const captureMemory = () =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { 
      source, 
      url, 
      title, 
      content_snippet, 
      timestamp, 
      wallet_address,
      full_content,
      page_metadata,
      page_structure,
      user_activity
    } = req.body;

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
      received_at: Date.now(),
      wallet_address: wallet_address || 'anonymous',
      full_content: full_content || '',
      page_metadata: page_metadata || {},
      page_structure: page_structure || {},
      user_activity: user_activity || {}
    };

    // Print formatted JSON to console with detailed breakdown
    console.log('\n=== RecallOS Memory Capture ===');
    console.log('Wallet Address:', wallet_address || 'Anonymous');
    console.log('URL:', url);
    console.log('Title:', title);
    console.log('Content Snippet:', content_snippet);
    console.log('Full Content Length:', full_content?.length || 0, 'characters');
    console.log('Page Metadata:', page_metadata);
    console.log('Page Structure:');
    console.log('  - Headings:', page_structure?.headings?.length || 0);
    console.log('  - Links:', page_structure?.links?.length || 0);
    console.log('  - Images:', page_structure?.images?.length || 0);
    console.log('  - Forms:', page_structure?.forms?.length || 0);
    console.log('User Activity:', user_activity);
    console.log('Full Data:', JSON.stringify(memoryData, null, 2));
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
