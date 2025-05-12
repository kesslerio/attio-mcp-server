# GitHub CLI (`gh`) Tool Guide

This guide explains how to use the GitHub CLI (`gh`) tool for workflows relevant to this project. The `gh` tool brings GitHub functionality to your terminal, making it easier to manage issues, pull requests, releases, and more.

## Table of Contents

1. [Overview & Installation](#overview--installation)
2. [Authentication](#authentication)
3. [Repository Management](#repository-management)
4. [Module Documentation](#module-documentation)

## Overview & Installation

The GitHub CLI (`gh`) is a command-line tool that brings GitHub to your terminal. It allows you to manage repositories, issues, pull requests, and more without leaving the command line.

- **macOS**: `brew install gh`
- **Other OS**: See [GitHub CLI Installation](https://cli.github.com/manual/installation)

## Authentication

Authenticate with GitHub to enable all features:

```sh
gh auth login
```
- Follow prompts to select GitHub.com and preferred authentication method (browser or token).
- To check current status:
  ```sh
  gh auth status
  ```

## Repository Management

- **Clone a repository:**
  ```sh
  gh repo clone <owner>/<repo>
  ```
- **Create a new repo (from current dir):**
  ```sh
  gh repo create
  ```
- **View repo info:**
  ```sh
  gh repo view --web
  ```

## Module Documentation

This documentation is split into several modules for better organization:

1. [Issues and Labels](./issues.md) - Working with issues and label management
2. [Projects and Milestones](./projects.md) - Project and milestone management
3. [Pull Requests](./pull-requests.md) - PR creation, review, and management
4. [Workflows and Best Practices](./workflows.md) - GitHub workflow recommendations and standards

## Tips

- Use `--help` with any command for more options, e.g. `gh pr create --help`
- Use `gh` in scripts for automation
- Check [GitHub CLI Manual](https://cli.github.com/manual/) for complete reference

## References

- [GitHub CLI Manual](https://cli.github.com/manual/)
- [GitHub CLI Cheat Sheet](https://github.com/cli/cli/blob/trunk/docs/cheat_sheet.md)
