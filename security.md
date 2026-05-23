# Security

ClientPad separates operator sessions from workspace API keys.

## Operator auth

Cloud operator accounts use email/password login, server-issued sessions, session restore, and logout.

## API keys

Workspace API keys are bearer tokens for integrations and should be stored server-side.

## Self-hosting

Self-hosted deployments keep the database and infrastructure under the developer's control.
