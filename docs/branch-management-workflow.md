# Branch Management Workflow

## Issue #321 Resolution Summary

This document summarizes the branch management workflow improvements implemented to resolve Issue #321.

## Problem Addressed

Issue #321 identified that work was being performed on unrelated branches instead of creating dedicated feature branches for specific GitHub issues.

## Solution Implemented

### 1. Enhanced CLAUDE.md Guidelines
- Added Critical Workflow Checklist (9-step process)
- Enhanced GitHub labeling system with comprehensive categorization
- Mandatory branch checking requirements before starting work
- Clear branch naming conventions with examples

### 2. Enhanced Labeling System
The following labeling improvements were implemented:

#### Priority Labels
- P0 (Critical), P1 (High), P2 (Medium), P3 (Low), P4 (Trivial), P5 (Very Low)

#### Type Labels  
- bug, feature, enhancement, documentation, test, refactor

#### Area Labels (Organized by Category)
- **Core**: area:core, area:api, area:build, area:dist, area:documentation, area:testing, area:performance, area:refactor, area:error-handling, area:logging, area:validation, area:cli, area:health, area:mcp, area:config, area:utils, area:prompts, area:tools
- **API Specific**: area:api:people, area:api:lists, area:api:notes, area:api:objects, area:api:records, area:api:tasks, area:search, area:attio
- **Integration**: area:integration, area:security, area:rate-limiting, extension

#### Special Labels
- breaking-change, dependencies, hotfix, debt, needs-triage

#### Meta Labels
- duplicate, invalid, question, wontfix, good first issue, help wanted, codex, integration-tests, testing

### 3. Critical Workflow Checklist

Before starting ANY GitHub issue work:

1. Check current branch: `git branch --show-current`
2. If not on main or appropriate feature branch, checkout main: `git checkout main` 
3. Pull latest changes: `git pull origin main`
4. Create issue branch: `git checkout -b feature/issue-{number}-{description}`
5. Verify clean state: `git status` 
6. Begin work implementation
7. Commit with issue reference: `git commit -m "Type: Description #issue-number"`
8. Push branch: `git push -u origin HEAD`
9. Create PR: `gh pr create -R kesslerio/attio-mcp-server`

### 4. Branch Strategy Enhancements

- **MANDATORY**: Check current branch before starting work
- **IMMEDIATELY**: Create proper branch if not on appropriate one  
- **NEVER**: Continue work on unrelated branches
- **Branch naming**: `feature/issue-{number}-{description}`, `fix/issue-{number}-{description}`

## Git Tracking Changes

As part of this resolution:
- CLAUDE.md has been removed from git tracking (already in .gitignore)
- CLAUDE.md should remain local to each development environment
- Contains project-specific instructions for Claude Code

## Validation

✅ All workflow requirements from Issue #321 have been implemented:
- Enhanced labeling system with comprehensive categorization
- Critical workflow checklist with explicit commands
- Branch management safeguards against cross-issue contamination
- Proper branch naming conventions with examples

This workflow ensures future issue work maintains clean git history and proper branch organization.