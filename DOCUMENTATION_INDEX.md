# RecallOS Documentation Index

Welcome to the complete RecallOS documentation. This index helps you find the right document for your needs.

## Quick Navigation

### For New Users
1. **Start here**: [README_COMPLETE.md](README_COMPLETE.md) - Complete overview, quick start guide
2. **Understand the system**: [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) - High-level architecture
3. **Learn the basics**: Quick start guides in README_COMPLETE.md

### For Developers
1. **Component details**: [COMPONENTS.md](COMPONENTS.md) - Detailed breakdown of every component
2. **API integration**: [API_REFERENCE.md](API_REFERENCE.md) - Complete API documentation
3. **Architecture**: [ARCHITECTURE_MEMORY_PIPELINE.md](ARCHITECTURE_MEMORY_PIPELINE.md) - Memory processing flow

### For System Architects
1. **Data flows**: [DATA_FLOW_DETAILED.md](DATA_FLOW_DETAILED.md) - Comprehensive flow diagrams
2. **Simple overview**: [DATA_FLOW_DIAGRAM.md](DATA_FLOW_DIAGRAM.md) - High-level data flow
3. **Architecture**: [ARCHITECTURE_MEMORY_PIPELINE.md](ARCHITECTURE_MEMORY_PIPELINE.md) - System design

---

## Document Descriptions

### README_COMPLETE.md
**Purpose**: Main entry point for the project  
**Audience**: Everyone  
**Contents**:
- What is RecallOS
- Key features overview
- Quick start guide
- Usage examples
- Project structure
- Technology stack
- Configuration
- Deployment guides
- Troubleshooting
- Roadmap

**When to read**: First time learning about RecallOS

---

### SYSTEM_OVERVIEW.md
**Purpose**: High-level system architecture and capabilities  
**Audience**: Product managers, architects, new developers  
**Contents**:
- Core capabilities (5 key areas)
- Complete system architecture diagram
- Key components (10 major components)
- Data flow summaries
- Use cases
- Privacy & security overview
- Future enhancements

**When to read**: After README, before diving into implementation details

---

### COMPONENTS.md
**Purpose**: Detailed technical documentation for every component  
**Audience**: Developers, system integrators  
**Contents**:
- Browser Extension (file structure, features, configuration)
- Express API Server (controllers, routes, middleware)
- AI Provider Service (embeddings, summarization, metadata)
- Database Layer (schema, tables, indexes)
- Smart Contract (functions, events, gas management)
- Memory Mesh Service (graph construction, relations, quality control)
- Search Service (query processing, AI answers, citations)
- Background Workers (content worker, blockscout worker)
- Web Client (pages, components, state management)
- SDK (client structure, usage)
- MCP Server (tools, transports, integration)

**When to read**: When implementing or modifying a specific component

---

### API_REFERENCE.md
**Purpose**: Complete REST API documentation  
**Audience**: Frontend developers, SDK users, integrators  
**Contents**:
- All API endpoints with examples
- Request/response formats
- Error handling
- Authentication
- SDK usage examples
- Webhook documentation (planned)

**Endpoints covered**:
- Memory endpoints (15+)
- Search endpoints (5+)
- Content endpoints (2)
- Deposit endpoints (4)
- Blockscout endpoints (2)

**When to read**: When integrating with the API or building clients

---

### ARCHITECTURE_MEMORY_PIPELINE.md
**Purpose**: Memory processing architecture and pipeline  
**Audience**: Backend developers, data engineers  
**Contents**:
- Ingestion flow
- AI processing details
- Hashing and anchoring
- Database storage schema
- Embeddings generation
- Indexing and search
- Memory linking (mesh)
- API endpoints
- Background processing
- Duplicates, fallbacks, retries
- Environment variables
- On-chain verification
- Lifecycle flows

**When to read**: When working on memory processing or understanding the pipeline

---

### DATA_FLOW_DIAGRAM.md
**Purpose**: Simple, visual data flow overview  
**Audience**: Everyone, especially visual learners  
**Contents**:
- System-level diagram
- Ingestion flow summary
- AI processing overview
- Hashing and timestamps
- Database storage
- On-chain anchoring
- Memory mesh generation
- Search pipeline
- Example payloads
- Reference code snippets

**When to read**: When you need a quick visual reference

---

### DATA_FLOW_DETAILED.md
**Purpose**: Comprehensive, step-by-step data flow documentation  
**Audience**: Developers, auditors, system integrators  
**Contents**:
- Complete memory ingestion flow (10 steps with diagrams)
- Complete search flow (12 steps with diagrams)
- Gas deposit flow (6 steps with diagrams)
- Technology stack summary
- Environment variables reference
- Performance metrics
- Security considerations

**When to read**: When you need to understand every step of a process in detail

---

## Documentation Map by Task

### I want to...

#### **Understand what RecallOS is**
→ Start with [README_COMPLETE.md](README_COMPLETE.md)  
→ Then read [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)

#### **Set up RecallOS locally**
→ Follow quick start in [README_COMPLETE.md](README_COMPLETE.md)  
→ Refer to component-specific sections in [COMPONENTS.md](COMPONENTS.md)

#### **Integrate with the API**
→ Read [API_REFERENCE.md](API_REFERENCE.md)  
→ Check SDK examples in [README_COMPLETE.md](README_COMPLETE.md)

#### **Understand the memory pipeline**
→ Read [ARCHITECTURE_MEMORY_PIPELINE.md](ARCHITECTURE_MEMORY_PIPELINE.md)  
→ Review detailed flow in [DATA_FLOW_DETAILED.md](DATA_FLOW_DETAILED.md)

#### **Work on the browser extension**
→ Jump to Browser Extension section in [COMPONENTS.md](COMPONENTS.md)  
→ Check extension/ directory in project structure

#### **Work on the web client**
→ Jump to Web Client section in [COMPONENTS.md](COMPONENTS.md)  
→ Check client/ directory in project structure

#### **Work on the smart contract**
→ Jump to Smart Contract section in [COMPONENTS.md](COMPONENTS.md)  
→ Check contract/ directory and DEPLOYMENT_GUIDE.md

#### **Understand the search system**
→ Read Search Service in [COMPONENTS.md](COMPONENTS.md)  
→ Review search flow in [DATA_FLOW_DETAILED.md](DATA_FLOW_DETAILED.md)

#### **Understand the memory mesh**
→ Read Memory Mesh Service in [COMPONENTS.md](COMPONENTS.md)  
→ Check mesh generation in [ARCHITECTURE_MEMORY_PIPELINE.md](ARCHITECTURE_MEMORY_PIPELINE.md)

#### **Deploy RecallOS**
→ Follow deployment sections in [README_COMPLETE.md](README_COMPLETE.md)  
→ Refer to component-specific deployment in [COMPONENTS.md](COMPONENTS.md)

#### **Troubleshoot issues**
→ Check Troubleshooting in [README_COMPLETE.md](README_COMPLETE.md)  
→ Review relevant component in [COMPONENTS.md](COMPONENTS.md)

#### **Contribute to the project**
→ Read Contributing section in [README_COMPLETE.md](README_COMPLETE.md)  
→ Understand architecture in [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)

---

## Document Reading Order

### Recommended for New Team Members

1. **Day 1**: [README_COMPLETE.md](README_COMPLETE.md) - Get the big picture
2. **Day 1**: [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) - Understand capabilities
3. **Day 2**: [DATA_FLOW_DIAGRAM.md](DATA_FLOW_DIAGRAM.md) - Visual overview
4. **Day 3**: [COMPONENTS.md](COMPONENTS.md) - Deep dive into your area
5. **Day 4**: [API_REFERENCE.md](API_REFERENCE.md) - Learn the API
6. **Day 5**: [ARCHITECTURE_MEMORY_PIPELINE.md](ARCHITECTURE_MEMORY_PIPELINE.md) - Master the pipeline
7. **Week 2+**: [DATA_FLOW_DETAILED.md](DATA_FLOW_DETAILED.md) - Reference as needed

### Recommended for Quick Integration

1. [README_COMPLETE.md](README_COMPLETE.md) - Quick start section
2. [API_REFERENCE.md](API_REFERENCE.md) - Endpoints you need
3. [COMPONENTS.md](COMPONENTS.md) - SDK section

### Recommended for System Audit

1. [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) - Architecture
2. [DATA_FLOW_DETAILED.md](DATA_FLOW_DETAILED.md) - Complete flows
3. [COMPONENTS.md](COMPONENTS.md) - Component details
4. [ARCHITECTURE_MEMORY_PIPELINE.md](ARCHITECTURE_MEMORY_PIPELINE.md) - Pipeline details

---

## Key Diagrams

### System Architecture
- Found in: [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)
- Type: High-level block diagram
- Best for: Understanding component relationships

### Data Flow (Simple)
- Found in: [DATA_FLOW_DIAGRAM.md](DATA_FLOW_DIAGRAM.md)
- Type: Flow diagram
- Best for: Quick reference

### Data Flow (Detailed)
- Found in: [DATA_FLOW_DETAILED.md](DATA_FLOW_DETAILED.md)
- Type: Step-by-step flow diagrams
- Best for: Understanding every step

### Memory Pipeline
- Found in: [ARCHITECTURE_MEMORY_PIPELINE.md](ARCHITECTURE_MEMORY_PIPELINE.md)
- Type: Flowchart
- Best for: Memory processing flow

---

## Keeping Documentation Updated

When making code changes, update the relevant documentation:

| Code Area | Documentation to Update |
|-----------|------------------------|
| API endpoints | [API_REFERENCE.md](API_REFERENCE.md) |
| Component logic | [COMPONENTS.md](COMPONENTS.md) |
| Data flows | [DATA_FLOW_DETAILED.md](DATA_FLOW_DETAILED.md) |
| Architecture | [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md), [ARCHITECTURE_MEMORY_PIPELINE.md](ARCHITECTURE_MEMORY_PIPELINE.md) |
| Configuration | [README_COMPLETE.md](README_COMPLETE.md) |
| Database schema | [COMPONENTS.md](COMPONENTS.md), [ARCHITECTURE_MEMORY_PIPELINE.md](ARCHITECTURE_MEMORY_PIPELINE.md) |

---

## Additional Resources

### In Repository
- `api/README.md` - API-specific setup
- `client/README.md` - Client-specific setup
- `extension/README.md` - Extension-specific setup
- `contract/README.md` - Contract-specific setup
- `contract/DEPLOYMENT_GUIDE.md` - Contract deployment
- `sdk/README.md` - SDK usage
- `mcp-server/README.md` - MCP server usage

### External Links
- Prisma Docs: https://www.prisma.io/docs
- pgvector: https://github.com/pgvector/pgvector
- Ethers.js: https://docs.ethers.org/v6/
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber
- OpenZeppelin: https://docs.openzeppelin.com/

---

## Documentation Standards

- **Code snippets**: Include language tag for syntax highlighting
- **API examples**: Show both request and response
- **Diagrams**: ASCII art for text files, Mermaid for rendering
- **Links**: Use relative paths for internal docs
- **Updates**: Date major changes in commit messages

---

**Last Updated**: October 2024  
**Maintained By**: RecallOS Documentation Team

For questions or improvements, please open an issue or submit a PR.

