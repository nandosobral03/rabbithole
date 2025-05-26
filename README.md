# Rabbithole: Wikipedia Graph Explorer

Rabbithole transforms the way people explore Wikipedia by turning the linear experience of following article links into beautiful, interactive graph visualizations. Instead of losing track of where you started or how you got there, users can see their entire exploration journey laid out as a dynamic network of interconnected knowledge.

The idea is to improve the experience of losing one's self down a wikipedia rabbit hole by providing a visual representation of the journey as well as allowing users to save and share their most interesting rabbit holes with others.

## What It Does

Users start by searching for any Wikipedia article, which becomes the first node in their graph. As they click on links within articles, new nodes are added and connected, building a visual map of their exploration. The graph uses physics simulation to naturally cluster related topics while maintaining readability.

The interface supports different interaction patterns:

- **Left click** on links to follow them and switch to that article
- **Middle click** to add articles to the graph without switching view
- **Right click** to remove nodes from the graph

Each rabbit hole can be saved and shared with others via unique URLs, complete with custom titles and descriptions. The application also tracks analytics across all shared rabbit holes, revealing popular articles, common connection patterns, and trending exploration paths.

## Technical Implementation

The project is built on the T3 Stack with Next.js 15, React 19, and tRPC for complete type safety across the entire application. The graph visualization is powered by react-force-graph-2d, which handles the force-directed layout and interactive controls.

For the backend, tRPC provides end-to-end type safety between the client and server. The database uses Drizzle ORM with SQLite for development and Turso for production. The analytics tables are carefully indexed to support complex queries about article popularity and connection patterns.

The Wikipedia integration fetches articles through their REST API, with smart caching strategies to avoid hitting rate limits. DOMPurify safely renders Wikipedia's HTML content, and sophisticated link parsing detects and creates connections between articles already in the graph.

## Key Features

- **Interactive force-directed graph** that naturally clusters related concepts
- **Smart duplicate prevention** and automatic connection detection between existing nodes
- **Responsive design** that adapts from mobile exploration to desktop analysis
- **Real-time loading states** and smooth animations for optimal user experience
- **Shareable rabbit holes** with persistent URLs and metadata
- **Community analytics** showing popular articles and connection patterns
- **Navigation history** with back button functionality
- **Featured content integration** with Wikipedia's daily highlights

---

Rabbithole represents a novel approach to knowledge exploration, transforming the chaotic beauty of Wikipedia browsing into structured, shareable, and visually compelling learning experiences.
