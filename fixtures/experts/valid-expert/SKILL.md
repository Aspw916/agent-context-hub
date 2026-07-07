---
name: code-reviewer
description: Automated code review expert for pull requests
version: 1.2.0
capabilities:
  - code-review
  - static-analysis
  - lint-suggestions
dependencies:
  - eslint
  - prettier
compatible_agents:
  - workbuddy
  - codex
---

# Code Reviewer Expert

This expert performs automated code reviews on pull requests.
It checks for common issues including:
- Code style violations
- Potential bugs
- Performance concerns
- Security vulnerabilities
