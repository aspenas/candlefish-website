#!/usr/bin/env python3
"""
Enhanced Claude Review Module

Implements:
- Selective file reviews
- Incremental reviews for PR updates
- File pattern filtering
- Review depth control
"""

import re
from typing import List, Dict, Optional
from datetime import datetime
from github import Github, PullRequest
from anthropic import Anthropic
import fnmatch


class EnhancedReviewer:
    """Enhanced PR reviewer with selective and incremental capabilities"""

    # Files to skip by default
    DEFAULT_SKIP_PATTERNS = [
        "*.lock",
        "*.lockb",
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "*.min.js",
        "*.min.css",
        "dist/*",
        "build/*",
        ".next/*",
        "node_modules/*",
        "*.map",
        "*.snap",
        "__snapshots__/*",
        "coverage/*",
        ".git/*",
        "*.generated.*",
        "*.auto-generated.*",
        "vendor/*",
        "*.svg",
        "*.png",
        "*.jpg",
        "*.jpeg",
        "*.gif",
        "*.ico",
        "*.woff",
        "*.woff2",
        "*.ttf",
        "*.eot",
    ]

    # Review depth configurations
    REVIEW_DEPTHS = {
        "quick": {
            "max_files": 20,
            "max_diff_size": 100000,  # 100KB
            "focus_areas": ["critical_bugs", "security", "syntax_errors"],
            "skip_tests": True,
            "skip_docs": True,
        },
        "standard": {
            "max_files": 50,
            "max_diff_size": 500000,  # 500KB
            "focus_areas": ["bugs", "security", "performance", "best_practices"],
            "skip_tests": False,
            "skip_docs": True,
        },
        "deep": {
            "max_files": 200,
            "max_diff_size": 2000000,  # 2MB
            "focus_areas": ["all"],
            "skip_tests": False,
            "skip_docs": False,
        },
    }

    def __init__(self, anthropic_client: Anthropic, github_client: Github):
        self.anthropic = anthropic_client
        self.github = github_client
        self.skip_patterns = self.DEFAULT_SKIP_PATTERNS.copy()

    def should_review_file(self, filename: str, skip_patterns: Optional[List[str]] = None) -> bool:
        """Check if a file should be reviewed based on patterns"""
        patterns = skip_patterns or self.skip_patterns

        for pattern in patterns:
            if fnmatch.fnmatch(filename, pattern):
                return False

        return True

    def get_previous_review_sha(self, pr: PullRequest.PullRequest) -> Optional[str]:
        """Get the commit SHA of the last Claude review"""
        # Look for previous Claude reviews in comments
        for comment in pr.get_issue_comments():
            if "🤖 Claude Code Review" in comment.body:
                # Extract commit SHA from comment if present
                sha_match = re.search(r"Reviewed commit: ([a-f0-9]{40})", comment.body)
                if sha_match:
                    return sha_match.group(1)

                # Fallback: get PR head SHA at comment time
                # This is approximate but better than nothing
                comment_time = comment.created_at
                for commit in pr.get_commits():
                    if commit.commit.author.date <= comment_time:
                        return commit.sha

        return None

    def get_files_since_last_review(self, pr: PullRequest.PullRequest) -> List[Dict]:
        """Get only files changed since last review"""
        last_review_sha = self.get_previous_review_sha(pr)

        if not last_review_sha:
            # No previous review, return all files
            return list(pr.get_files())

        # Get commits since last review
        all_commits = list(pr.get_commits())
        new_commits = []
        found_last_review = False

        for commit in all_commits:
            if found_last_review:
                new_commits.append(commit)
            elif commit.sha == last_review_sha:
                found_last_review = True

        if not new_commits:
            return []

        # Get unique files from new commits
        changed_files = set()
        for commit in new_commits:
            for file in commit.files:
                changed_files.add(file.filename)

        # Filter PR files to only include changed ones
        pr_files = list(pr.get_files())
        return [f for f in pr_files if f.filename in changed_files]

    def filter_files_by_depth(self, files: List, depth: str) -> List:
        """Filter files based on review depth settings"""
        config = self.REVIEW_DEPTHS.get(depth, self.REVIEW_DEPTHS["standard"])
        filtered = []
        total_size = 0

        for file in files:
            # Skip if exceeds file limit
            if len(filtered) >= config["max_files"]:
                break

            # Skip tests if configured
            if config["skip_tests"] and any(
                pattern in file.filename.lower() for pattern in ["test", "spec", "__tests__"]
            ):
                continue

            # Skip docs if configured
            if config["skip_docs"] and any(
                pattern in file.filename.lower() for pattern in [".md", "docs/", "documentation/"]
            ):
                continue

            # Skip if file should not be reviewed
            if not self.should_review_file(file.filename):
                continue

            # Check cumulative size
            file_size = len(file.patch) if file.patch else 0
            if total_size + file_size > config["max_diff_size"]:
                break

            filtered.append(file)
            total_size += file_size

        return filtered

    def build_enhanced_prompt(
        self,
        pr: PullRequest.PullRequest,
        files: List,
        review_type: str,
        depth: str,
        is_incremental: bool,
    ) -> str:
        """Build an enhanced review prompt"""
        # Use depth configuration (currently unused but reserved for future enhancement)

        # Build file list and diff
        file_list = []
        diff_content = ""

        for file in files:
            file_list.append(f"- {file.filename} (+{file.additions}/-{file.deletions})")
            if file.patch:
                diff_content += f"\n\n--- {file.filename} ---\n{file.patch}"

        # Base context
        prompt = f"""
        {"INCREMENTAL " if is_incremental else ""}Pull Request Review
        PR #{pr.number}: {pr.title}
        Author: {pr.user.login}
        Review Depth: {depth.upper()}
        Review Type: {review_type}

        {"This is an INCREMENTAL review - only reviewing changes since the last Claude review." if is_incremental else ""}

        Files to Review ({len(files)} files):
        {chr(10).join(file_list)}

        Description:
        {pr.body or "No description provided"}

        DIFF:
        {diff_content}
        """

        # Add review instructions based on depth and type
        if depth == "quick":
            prompt += """

        QUICK REVIEW - Focus on:
        1. Critical bugs that would cause runtime errors
        2. Obvious security vulnerabilities
        3. Major performance issues (O(n²) or worse)

        Keep the review concise. Only flag serious issues.
        """
        elif depth == "deep":
            prompt += """

        DEEP REVIEW - Comprehensive analysis including:
        1. Code architecture and design patterns
        2. Detailed security analysis
        3. Performance optimization opportunities
        4. Test coverage and quality
        5. Documentation completeness
        6. Best practices and code style
        7. Potential edge cases and error handling

        Provide detailed feedback with code examples.
        """

        # Add focus areas based on review type
        review_focuses = {
            "security": """
        SECURITY FOCUS:
        - Input validation and sanitization
        - Authentication and authorization
        - Sensitive data exposure
        - Injection vulnerabilities
        - Dependencies with known vulnerabilities
        """,
            "performance": """
        PERFORMANCE FOCUS:
        - Algorithm complexity analysis
        - Database query optimization
        - Memory usage and leaks
        - Caching opportunities
        - Bundle size impact
        """,
            "architecture": """
        ARCHITECTURE FOCUS:
        - Design pattern adherence
        - SOLID principles
        - Code organization and modularity
        - Dependency management
        - API design and contracts
        """,
        }

        if review_type in review_focuses:
            prompt += review_focuses[review_type]

        return prompt

    def parse_review_command(self, comment_body: str) -> Dict:
        """Parse review command from PR comment"""
        # Default settings
        settings = {
            "review_type": "comprehensive",
            "depth": "standard",
            "incremental": False,
            "skip_patterns": [],
        }

        # Check for /claude-review command
        if "/claude-review" not in comment_body:
            return None

        # Parse command options
        command_match = re.search(r"/claude-review\s*(.*?)(?:\n|$)", comment_body)
        if command_match:
            options = command_match.group(1).strip().split()

            for option in options:
                if option in [
                    "security",
                    "performance",
                    "architecture",
                    "comprehensive",
                ]:
                    settings["review_type"] = option
                elif option in ["quick", "deep"]:
                    settings["depth"] = option
                elif option == "incremental":
                    settings["incremental"] = True
                elif option.startswith("skip:"):
                    # e.g., skip:*.test.js,*.spec.ts
                    patterns = option[5:].split(",")
                    settings["skip_patterns"].extend(patterns)

        return settings

    def format_enhanced_review(self, review_content: str, pr_number: int, metadata: Dict) -> str:
        """Format the review with metadata"""
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        header = f"""## 🤖 Claude Code Review

**PR:** #{pr_number}
**Type:** {metadata.get("review_type", "comprehensive").title()}
**Depth:** {metadata.get("depth", "standard").upper()}
**Mode:** {"Incremental" if metadata.get("is_incremental") else "Full"}
**Files Reviewed:** {metadata.get("files_reviewed", 0)}/{metadata.get("total_files", 0)}
**Timestamp:** {timestamp}"""

        if metadata.get("last_review_sha"):
            header += f"\n**Changes Since:** `{metadata['last_review_sha'][:8]}`"

        if metadata.get("skipped_files"):
            header += f"\n**Files Skipped:** {metadata['skipped_files']} (based on patterns)"

        footer = f"""
---

<details>
<summary>📋 Review Commands</summary>

- `/claude-review` - Standard comprehensive review
- `/claude-review quick` - Quick review for obvious issues
- `/claude-review deep` - Deep analysis of architecture and design
- `/claude-review security` - Security-focused review
- `/claude-review performance` - Performance-focused review
- `/claude-review incremental` - Only review changes since last Claude review
- `/claude-review quick incremental` - Combine options
- `/claude-review skip:*.test.js,*.spec.ts` - Skip specific patterns

</details>

<details>
<summary>💰 Cost Information</summary>

- **Input tokens:** {metadata.get("input_tokens", 0):,}
- **Output tokens:** {metadata.get("output_tokens", 0):,}
- **Estimated cost:** ${metadata.get("estimated_cost", 0):.3f}
- **Review duration:** {metadata.get("duration", 0):.1f}s

</details>

*Powered by Claude Opus-4 with enhanced review capabilities*
*Reviewed commit: {metadata.get("head_sha", "unknown")}*"""

        return f"{header}\n\n{review_content}\n\n{footer}"
