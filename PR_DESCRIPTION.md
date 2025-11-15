# PR Title
```
feat: enhance memory management, email drafting, and job processing with privacy controls
```

# PR Description
```
## Summary
Comprehensive enhancement of core features including memory management, email drafting capabilities, privacy controls, and job processing optimizations.

## Key Changes
- **Email Drafting**: Gmail/Outlook integration with AI-powered context-aware replies
- **Memory Management**: Redaction, scoring, reranking, and enhanced search capabilities
- **Privacy & Audit**: User privacy settings and comprehensive audit logging
- **Performance**: Queue processing optimizations, Redis timeout management, and parallel AI calls

## Technical Improvements
- Refactored content submission and job processing logic
- Enhanced error handling and cancellation status tracking
- Improved queue cleanup and status monitoring
- Added new services for memory ingestion, scoring, and retrieval policies
- Removed project grouping feature to simplify codebase

## Files Changed
- 61 files changed, 6,857 insertions(+), 830 deletions(-)
- New controllers: email, privacy, export-import, admin
- New services: memory-ingestion, memory-scoring, reranking, privacy
- New UI pages: inbox, knowledge-health
- Removed: project grouping feature (controller, service, routes, UI)

## Breaking Changes
- Removed `/api/projects` endpoints
- Removed `/projects` frontend route
```

