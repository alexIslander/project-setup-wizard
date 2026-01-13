# How the Project Setup Wizard Works

This document explains how to use the Project Setup Wizard and how it generates your project.

## Overview

The Project Setup Wizard is an interactive command-line tool that guides you through a series of questions to create a fully configured project scaffold. It generates all the necessary configuration files, project structure, and setup scripts based on your answers.

## How to Use the Wizard

### Starting the Wizard

Run the wizard using one of these methods:

```bash
pnpm start
```

or

```bash
node wizard.js
```

If you've installed it globally:

```bash
project-wizard
```

### The Wizard Flow

The wizard asks you questions in 5 main sections:

#### 1. Project Basics
- **Project Type**: Choose from Web app, CLI tool, Library, API service, Mobile app, or Other
- **Programming Language**: Select JavaScript/TypeScript, Java, Rust, Python, .NET, or Other
- **Description**: Optionally provide a brief description of your project

You can answer by typing the number (e.g., `1`) or the full text. Press Enter to use the default value if one is shown.

#### 2. Development Environment
- **Nx Workspace**: Choose whether to use Nx for project management (recommended for JavaScript/TypeScript and Java projects)
- **Specific Dependencies**: Optionally list any system-level dependencies you need (comma-separated)
- **Nx Automation**: If using Nx, choose whether to enable automated project structure
- **Nx Technology Preset**: If using Nx, choose a preset (TypeScript, Angular, React, Vue, Node, Java, .NET)

#### 3. Coding Assistant
- **AI Assistant**: Choose between Gemini CLI (default), Claude Code, Codex CLI, or None
- **Expected Commands**: Specify which AI commands you'll use most (e.g., `scaffold,build,test`)
- **Helper Scripts**: Choose whether to generate helper scripts for AI commands
- **Documentation**: Choose whether to include sample CLI usage documentation

#### 4. Deployment
- **Deployment Target**: Select Docker container, Kubernetes, Serverless/cloud platform, or Other
- **Docker Setup**: Choose whether to create Dockerfile and container configuration
- **Base Image**: If creating Docker files, select your preferred base OS (Alpine, Ubuntu, Debian, or Other)

#### 5. GitHub Template
- **Repository Name**: Enter the name for your GitHub repository
- **Git Initialization**: Choose whether to initialize a Git repository locally
- **README Generation**: Choose whether to generate README and contributing guidelines
- **Versioning**: Choose whether to set up version tagging and release support

### After the Wizard Completes

Once you've answered all questions, the wizard will:

1. Create a project directory with your specified repository name
2. Generate all configuration files based on your choices
3. Set up the project structure
4. Initialize Git (if selected) with an initial commit

You'll see a success message with next steps, including:
- How to navigate to your new project
- How to enter the Devbox development environment
- How to use your AI assistant (if configured)
- How to use Nx commands (if configured)

## What Gets Generated

The wizard creates different files depending on your choices:

### Always Generated
- **`devbox.json`**: Devbox configuration with required packages and shell setup
- Project directory structure (`src/`, `docs/`, `scripts/`, `tests/`)

### If Using Nx
- **`nx.json`**: Nx workspace configuration with appropriate plugins
- **`package.json`**: Node.js package configuration with Nx scripts

### If Not Using Nx
- Simple project structure with language-specific starter files
- Build scripts in `scripts/` directory

### If AI Assistant Selected
- **`.gemini.json`**, **`.claude.json`**, or **`.codex.json`**: AI assistant configuration
- Installation scripts in `scripts/` directory

### If Docker Selected
- **`Dockerfile`**: Language-specific Docker configuration
- **`docker-compose.yml`**: Docker Compose setup for local development
- **`.dockerignore`**: Files to exclude from Docker builds

### If README Selected
- **`README.md`**: Project documentation with setup instructions

### If Git Initialization Selected
- **`.gitignore`**: Git ignore file with language-specific patterns
- Initial Git commit with all generated files

### Language-Specific Files

The wizard adapts to your chosen language:

- **JavaScript/TypeScript**: `package.json`, Node.js scripts
- **Python**: `requirements.txt`, virtual environment setup, `src/main.py`
- **Rust**: `Cargo.toml` structure, `src/main.rs`
- **Java**: Maven configuration, build scripts
- **.NET**: .NET SDK setup

## How the Wizard Works Internally

### Architecture

The wizard is built as a single class that manages the entire flow:
- Uses Node.js `readline` for interactive prompts
- Stores all answers in an object
- Generates files programmatically based on collected answers

### Input Handling

The wizard provides two types of questions:
- **General questions**: Accept text input, numbered options, or default values
- **Yes/No questions**: Accept "yes", "y", or empty (uses default)

You can answer numbered questions by typing the number or the full option text.

### Generation Process

After collecting all answers, the wizard:
1. Creates the project directory
2. Generates `devbox.json` with appropriate packages
3. Sets up project structure (Nx or simple)
4. Creates AI assistant configs (if selected)
5. Generates Docker files (if selected)
6. Creates README (if selected)
7. Generates language-specific requirement files
8. Initializes Git (if selected)

### Language Adaptation

The wizard automatically:
- Selects appropriate Devbox packages for your language
- Generates language-specific build, test, and dev scripts
- Creates starter files in the correct format
- Configures Docker images and commands for your language
- Sets up appropriate test frameworks

### Smart Recommendations

The wizard makes intelligent recommendations:
- Suggests Nx for JavaScript/TypeScript and Java projects
- Recommends Gemini CLI by default for AI assistance
- Maps Python package names to system packages (e.g., `ffmpeg-python` → `ffmpeg`)
- Only includes safe, known system packages in Devbox config

## Tips for Using the Wizard

1. **Use Defaults**: Most questions have sensible defaults - press Enter to accept them
2. **Numbered Options**: You can type `1`, `2`, etc. instead of full text for faster input
3. **Dependencies**: When specifying dependencies, use comma-separated values. The wizard will map Python package names to system packages when possible
4. **Project Name**: Choose a clear repository name - it will be used for the directory and Git setup
5. **AI Commands**: Think about which AI commands you'll use most - this helps generate better helper scripts

## Troubleshooting

### Git Initialization Fails
If Git initialization fails, you can manually initialize:
```bash
cd your-project-name
git init
git add .
git commit -m "Initial commit"
```

### Missing Packages
If you need additional system packages, you can manually edit `devbox.json` after generation.

### AI Assistant Not Working
Make sure you've set the required API keys:
- For Gemini: `export GEMINI_API_KEY=your_key`
- For Claude: `export ANTHROPIC_API_KEY=your_key`
- For Codex: `export OPENAI_API_KEY=your_key`

The installation scripts in `scripts/` will guide you through setup.

## Extending the Wizard

The wizard is designed to be extensible. To add new features:
1. Add new questions in the `run()` method
2. Create generator methods for new file types
3. Update language-specific logic as needed

All generation is based on the collected answers, making it easy to add new options.
