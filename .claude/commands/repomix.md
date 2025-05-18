Please extract the optimized codebase, most recent logs, and GitHub issues using repomix and gh2md to prepare for comprehensive analysis while minimizing token usage.

**Note:** This command assumes the `analysis/` directory already exists and that the `gh2md` tool is installed and available in your PATH.

I'll generate three files:
1. An optimized view of the lead enrichment codebase (including only relevant source code and documentation)
2. The most recent production logs
3. GitHub issues and PRs (limited to first 10,000 lines)

**Steps:**

1. **Extract Optimized Codebase**
   ```bash
   repomix --include "lead_enrichment/src/core/**,lead_enrichment/src/cli.py,lead_enrichment/src/main.py,docs/README.md,docs/ARCHITECTURE_*.md,docs/CONFIGURATION.md,docs/api/API_CLIENT_REFACTORING.md,docs/api/API_CLIENT_USAGE_EXAMPLES.md,docs/api/ERROR_HANDLING_GUIDE.md,docs/api/FORMAT_TEXT_DEVELOPER_GUIDE.md,docs/api/FORMAT_TEXT_HANDLING.md,docs/api/OPENAI_STRUCTURED_OUTPUTS.md,docs/api/UNIFIED_SCHEMA_MIGRATION_GUIDE.md,docs/api/OPENAI_RESPONSES_API_INTEGRATION.md" --ignore "lead_enrichment/src/tests/**,**/__pycache__/**,**/*.pyc,**/*.pyo,lead_enrichment/src/scripts/**,lead_enrichment/data/*.csv,lead_enrichment/src/tradeshows/asaps25/**,lead_enrichment/src/tradeshows/cryocon25/**,lead_enrichment/src/tradeshows/generic/**,**/.venv/**,**/env/**,**/dist/**,**/build/**,**/*.egg-info/**,lead_enrichment/logs/**,lead_enrichment/cache/**,lead_enrichment/docs/**,.gitignore,requirements.txt,setup.py,pytest.ini,lead_enrichment/data/known_*.json" --style xml -o analysis/lead_enrichment_codebase.xml
   ```

2. **Extract Compressed Codebase**
   ```bash
   repomix --include "lead_enrichment/src/core/**,lead_enrichment/src/cli.py,lead_enrichment/src/main.py,docs/README.md,docs/ARCHITECTURE_*.md,docs/CONFIGURATION.md,docs/api/API_CLIENT_REFACTORING.md,docs/api/API_CLIENT_USAGE_EXAMPLES.md,docs/api/ERROR_HANDLING_GUIDE.md,docs/api/FORMAT_TEXT_DEVELOPER_GUIDE.md,docs/api/FORMAT_TEXT_HANDLING.md,docs/api/OPENAI_STRUCTURED_OUTPUTS.md,docs/api/UNIFIED_SCHEMA_MIGRATION_GUIDE.md,docs/api/OPENAI_RESPONSES_API_INTEGRATION.md" --ignore "lead_enrichment/src/tests/**,**/__pycache__/**,**/*.pyc,**/*.pyo,lead_enrichment/src/scripts/**,lead_enrichment/data/*.csv,lead_enrichment/src/tradeshows/asaps25/**,lead_enrichment/src/tradeshows/cryocon25/**,lead_enrichment/src/tradeshows/generic/**,**/.venv/**,**/env/**,**/dist/**,**/build/**,**/*.egg-info/**,lead_enrichment/logs/**,lead_enrichment/cache/**,lead_enrichment/docs/**,.gitignore,requirements.txt,setup.py,pytest.ini,lead_enrichment/data/known_*.json" --style xml -o analysis/lead_enrichment_codebase_compressed.xml --compress
   ```

3. **Extract Latest Logs**
   ```bash
   repomix --include "lead_enrichment/logs/production/latest/**" --no-gitignore --no-default-patterns -o analysis/logs.xml
   ```

4. **Extract GitHub Issues and PRs**
   ```bash
   gh2md kesslerio/tradeshow-data-processing analysis/gh_issues_prs.txt
   ```

5. **Trim GitHub Issues File to 10,000 Lines**
   ```bash
   head -n 10000 analysis/gh_issues_prs.txt > analysis/gh_issues_prs_trimmed.txt && mv analysis/gh_issues_prs_trimmed.txt analysis/gh_issues_prs.txt
   ```

**Optimization Rationale:**
- **Included:** Core source code, configuration files, architecture docs, API docs, known data files
- **Excluded:** Tests, logs (except latest), cache, scripts, sample data, build artifacts, virtual environments, bytecode

**Usage Context:**
This command is useful when you need to:
- Analyze the current state of the codebase with minimal token usage
- Investigate recent production issues
- Review GitHub issues and PRs for context
- Prepare for refactoring or debugging tasks
- Get a comprehensive view of the system architecture, logs, and project history in one step
