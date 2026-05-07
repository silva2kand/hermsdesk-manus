# HermesDesk System Design

HermesDesk is a high-performance, local-first AI workstation designed to bridge the gap between user intent and system-level execution. It integrates advanced language models with deep desktop integration and a multi-agent orchestration layer.

## Architecture Overview

The system follows a modular architecture consisting of the following key layers:

1.  **Frontend (Electron Renderer)**: Built with React and Vite, providing a premium, high-fidelity UI (Mail ME, Voice Command Center, Agentic Sidebar).
2.  **Main Process (Electron Main)**: Orchestrates IPC communication, manages background synchronization, and hosts the core service layer.
3.  **Service Layer**: Native TypeScript services for specialized tasks (Email Indexing, Local AI Inference, Voice Synthesis, Desktop Integration).
4.  **Agentic Layer (Multi-Agent Orchestrator)**: Manages a fleet of specialized agents (Hermes, Paperclips, Accountant, Solicitor) using an approval-first execution model.

## Core Services

### Email Indexing Service (`EmailIndexService`)
- **Local-First Indexing**: Stores email metadata in a highly optimized JSON-based local database within `userData/email-indexes`.
- **Hybrid Sync**: Supports real-time paged crawls from Microsoft Graph (OAuth) and native COM-based scanning for Classic Outlook.
- **Categorization**: Automatically classifies incoming mail into actionable categories (Legal, Tax, Payments, General).

### Desktop Integration Service (`DesktopIntegrationService`)
- **Native Automation**: Leverages PowerShell and COM objects to interact with Windows applications (Outlook, File Explorer).
- **Security**: Implements a strict "no-deletion" policy; all system mutations require explicit user approval.

### Local AI Inference (`LocalAIService`)
- **Multi-Engine Support**: Seamlessly routes requests between Jan (TurboQuant), Ollama, and LM Studio.
- **Context Management**: Handles large context windows and RAG (Retrieval Augmented Generation) for document analysis.

### Voice Pipeline
- **Synthesis**: Uses native Windows SAPI (`en-us-sapi`) for reliable, offline speech generation.
- **Recognition**: Supports system-level audio capture for voice commands.

## AI Agent Workflow

HermesDesk operates on an **Approval-First Workflow**:

1.  **Ingestion**: Services (Email, Voice) feed raw data into the `MultiAgentOrchestrator`.
2.  **Analysis**: The orchestrator selects the appropriate agent (e.g., Accountant Agent for invoices).
3.  **Proposal**: The agent generates a proposed action (e.g., a draft reply or a task entry).
4.  **Audit**: The user reviews the proposal in the "Right Approval Sidebar".
5.  **Execution**: Upon approval, the `DesktopIntegrationService` executes the final action.

## Security & Privacy

- **100% Offline Capable**: Primary intelligence runs locally to ensure data sovereignty.
- **Encrypted Secrets**: Microsoft Graph secrets and other sensitive tokens are stored securely in the local Electron store.
- **Read-Only by Default**: Background processes are restricted from making destructive changes without a user's verified intent.
