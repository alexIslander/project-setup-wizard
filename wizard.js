#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectWizard {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.answers = {};
  }

  async ask(question, options = null, defaultValue = null) {
    return new Promise((resolve) => {
      let prompt = question;
      if (options) {
        prompt += `\n${options.map((opt, i) => `  ${i + 1}. ${opt}`).join('\n')}\n`;
      }
      if (defaultValue) {
        prompt += ` [default: ${defaultValue}]`;
      }
      prompt += '\n> ';
      
      this.rl.question(prompt, (answer) => {
        const trimmedAnswer = answer.trim();
        if (trimmedAnswer === '' && defaultValue) {
          resolve(defaultValue);
        } else {
          resolve(trimmedAnswer);
        }
      });
    });
  }

  async askYesNo(question, defaultAnswer = 'yes') {
    const answer = await this.ask(`${question} (yes/no) [default: ${defaultAnswer}]`);
    return answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y' || 
           (answer === '' && defaultAnswer === 'yes');
  }

  async run() {
    console.log('🚀 Project Setup Wizard');
    console.log('========================\n');

    // 1. Project Basics
    console.log('📋 Project Basics');
    console.log('-----------------');
    
    const projectTypes = [
      'Web app', 
      'CLI tool', 
      'Library', 
      'API service', 
      'Mobile app', 
      'Other'
    ];
    
    const projectTypeAnswer = await this.ask(
      'What kind of project do you want to build?', 
      projectTypes,
      'Web app'
    );
    
    // Handle both number selection and direct text
    const projectTypeIndex = parseInt(projectTypeAnswer) - 1;
    this.answers.projectType = (projectTypeIndex >= 0 && projectTypeIndex < projectTypes.length) 
      ? projectTypes[projectTypeIndex] 
      : projectTypeAnswer;

    const languages = [
      'JavaScript/TypeScript',
      'Java (Spring Boot/Quarkus)',
      'Rust',
      'Python',
      '.NET',
      'Other'
    ];

    const languageAnswer = await this.ask(
      'What is the primary programming language or framework?',
      languages,
      'JavaScript/TypeScript'
    );
    
    const languageIndex = parseInt(languageAnswer) - 1;
    this.answers.language = (languageIndex >= 0 && languageIndex < languages.length) 
      ? languages[languageIndex] 
      : languageAnswer;

    this.answers.projectDescription = await this.ask(
      'Briefly describe the main purpose or functionality (optional):',
      null,
      'A new development project'
    );

    // 2. Nx and Development Environment
    console.log('\n🔧 Development Environment');
    console.log('---------------------------');

    const shouldUseNx = this.shouldRecommendNx();
    this.answers.useNx = await this.askYesNo(
      `Do you want to use Nx for managing your project workspace? ${shouldUseNx ? '(Recommended for your language)' : '(Devbox-only recommended for your language)'}`,
      shouldUseNx ? 'yes' : 'no'
    );

    this.answers.specificDependencies = await this.ask(
      'Do you have specific dependencies or tools you want preconfigured? (comma-separated, optional):',
      null,
      ''
    );

    if (this.answers.useNx) {
      this.answers.enableAutomation = await this.askYesNo(
        'Enable automated project structure and task orchestration via Nx?',
        'yes'
      );
    }

    // 3. Coding Assistant
    console.log('\n🤖 Coding Assistant');
    console.log('-------------------');

    this.answers.useGeminiCLI = await this.askYesNo(
      'Use Gemini CLI as your coding assistant? (default recommendation)',
      'yes'
    );

    if (!this.answers.useGeminiCLI) {
      this.answers.useClaudeCode = await this.askYesNo(
        'Would you prefer to use Claude Code instead?',
        'yes'
      );
    }

    // Updated command handling - accept comma-separated list
    const assistantCommands = [
      'scaffold', 'build', 'test', 'deploy', 'refactor', 'debug', 'optimize', 'document'
    ];

    const defaultCommands = 'scaffold,build,test';
    this.answers.expectedCommands = await this.ask(
      `Which commands do you expect to use most? (comma-separated)\nAvailable: ${assistantCommands.join(', ')}`,
      null,
      defaultCommands
    );

    this.answers.generateScripts = await this.askYesNo(
      'Generate helper scripts for CLI commands?',
      'yes'
    );

    this.answers.includeDocs = await this.askYesNo(
      'Include sample CLI usage documentation?',
      'yes'
    );

    // 4. Deployment
    console.log('\n🐳 Deployment');
    console.log('--------------');

    const deploymentTargets = [
      'Docker container',
      'Kubernetes',
      'Serverless/cloud platform',
      'Other'
    ];

    const deploymentAnswer = await this.ask(
      'What is your preferred deployment target?',
      deploymentTargets,
      'Docker container'
    );
    
    const deploymentIndex = parseInt(deploymentAnswer) - 1;
    this.answers.deploymentTarget = (deploymentIndex >= 0 && deploymentIndex < deploymentTargets.length) 
      ? deploymentTargets[deploymentIndex] 
      : deploymentAnswer;

    this.answers.createDockerfile = await this.askYesNo(
      'Create Dockerfile and container setup?',
      'yes'
    );

    if (this.answers.createDockerfile) {
      const baseImages = ['Alpine', 'Ubuntu', 'Debian', 'Other'];
      const imageAnswer = await this.ask(
        'Preferred base OS/image for Docker?',
        baseImages,
        'Alpine'
      );
      
      const imageIndex = parseInt(imageAnswer) - 1;
      this.answers.baseImage = (imageIndex >= 0 && imageIndex < baseImages.length) 
        ? baseImages[imageIndex] 
        : imageAnswer;
    }

    // 5. GitHub Template
    console.log('\n📚 GitHub Template');
    console.log('-------------------');

    this.answers.repoName = await this.ask(
      'GitHub repository name for this template:',
      null,
      'my-project'
    );

    this.answers.initGit = await this.askYesNo(
      'Initialize Git repository locally?',
      'yes'
    );

    this.answers.generateReadme = await this.askYesNo(
      'Generate README and contributing guidelines?',
      'yes'
    );

    this.answers.setupVersioning = await this.askYesNo(
      'Set up version tagging and release support?',
      'yes'
    );

    // Generate project
    await this.generateProject();
  }

  shouldRecommendNx() {
    const jsBasedLanguages = ['JavaScript/TypeScript', 'Web app'];
    const javaLanguages = ['Java (Spring Boot/Quarkus)'];
    
    return jsBasedLanguages.some(lang => 
      this.answers.language?.includes(lang) || this.answers.projectType?.includes(lang)
    ) || javaLanguages.some(lang => this.answers.language?.includes(lang));
  }

  async generateProject() {
    console.log('\n🏗️  Generating Project...');
    console.log('========================');

    const projectPath = path.join(process.cwd(), this.answers.repoName || 'my-project');
    
    try {
      // Create project directory
      if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
      }

      // Generate devbox.json
      this.generateDevboxConfig(projectPath);

      // Generate project structure based on choices
      if (this.answers.useNx) {
        await this.generateNxSetup(projectPath);
      } else {
        await this.generateDevboxOnlySetup(projectPath);
      }

      // Generate AI assistant config
      this.generateAIConfig(projectPath);

      // Generate Dockerfile
      if (this.answers.createDockerfile) {
        this.generateDockerfile(projectPath);
      }

      // Generate README
      if (this.answers.generateReadme) {
        this.generateReadme(projectPath);
      }

      // Generate requirements files if needed
      this.generateRequirementsFiles(projectPath);

      // Initialize Git
      if (this.answers.initGit) {
        this.initializeGit(projectPath);
      }

      console.log(`\n✅ Project created successfully at: ${projectPath}`);
      console.log('\nNext steps:');
      console.log(`  cd ${this.answers.repoName || 'my-project'}`);
      console.log('  devbox shell');
      
      if (this.answers.useGeminiCLI) {
        console.log('  # Gemini CLI available via npx alias in Devbox shell');
        console.log('  # If alias not present, use: npx -y @google/gemini-cli');
        console.log('  gemini --help');
      }
      
      if (this.answers.useClaudeCode) {
        console.log('  # Claude Code available via npx alias in Devbox shell');
        console.log('  # If alias not present, use: npx -y @anthropic-ai/claude-code');
        console.log('  claude --help');
      }
      
      if (this.answers.useNx) {
        console.log('  nx --help');
      }
      console.log('\nHappy coding! 🎉');

    } catch (error) {
      console.error('❌ Error generating project:', error.message);
    }

    this.rl.close();
  }

  generateDevboxConfig(projectPath) {
    const config = {
      packages: this.getDevboxPackages(),
      shell: {
        init_hook: this.getInitHook(),
        scripts: this.getShellScripts()
      }
    };

    fs.writeFileSync(
      path.join(projectPath, 'devbox.json'),
      JSON.stringify(config, null, 2)
    );
  }

  getDevboxPackages() {
    const packages = ['git', 'curl', 'wget'];
    
    // Language-specific packages
    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      packages.push('nodejs', 'yarn');
    }
    if (this.answers.language?.includes('Java')) {
      packages.push('jdk', 'maven');
    }
    if (this.answers.language?.includes('Rust')) {
      packages.push('rustc', 'cargo');
    }
    if (this.answers.language?.includes('Python')) {
      packages.push('python3');
    }
    if (this.answers.language?.includes('.NET')) {
      packages.push('dotnet-sdk');
    }
    if (this.answers.createDockerfile) {
      packages.push('docker');
    }
    if (this.answers.useNx) {
      packages.push('nodejs', 'yarn');
    }

    // Add AI assistant CLI tools
    if (this.answers.useGeminiCLI) {
      packages.push('nodejs');
    }
    if (this.answers.useClaudeCode) {
      packages.push('nodejs'); // Claude Code requires Node.js
    }

    // Add specific dependencies from user input safely (only known system packages)
    if (this.answers.specificDependencies) {
      const deps = this.answers.specificDependencies
        .split(',')
        .map(dep => dep.trim())
        .filter(dep => dep.length > 0);

      const pythonToSystem = {
        'ffmpeg-python': 'ffmpeg',
        'opencv-python': 'opencv',
        'pillow': 'libjpeg',
        'numpy': 'openblas',
        'scipy': 'openblas',
        'whisper': 'openai-whisper'
      };

      const allowedSystemPackages = new Set([
        'ffmpeg',
        'yt-dlp',
        'openai-whisper',
        'opencv',
        'libjpeg',
        'openblas',
        'docker',
        'nodejs',
        'yarn',
        'python3',
        'rustc',
        'cargo',
        'jdk',
        'maven',
        'dotnet-sdk',
        'git',
        'curl',
        'wget'
      ]);

      deps.forEach(dep => {
        const key = dep.toLowerCase();
        const mapped = pythonToSystem[key];
        if (mapped && allowedSystemPackages.has(mapped)) {
          packages.push(mapped);
          return;
        }
        if (allowedSystemPackages.has(key)) {
          packages.push(key);
        }
        // Otherwise, skip adding to devbox packages; handle via language package manager
      });
    }

    return [...new Set(packages)]; // Remove duplicates
  }

  getInitHook() {
    let hook = 'echo "🚀 Development environment ready!"';
    
    // Language-specific setup
    if (this.answers.language?.includes('Python')) {
      hook += '\n# Create and activate a Python virtual environment';
      hook += '\nif [ -x ".venv/bin/activate" ]; then';
      hook += '\n  . .venv/bin/activate';
      hook += '\nelse';
      hook += '\n  echo "🐍 Creating Python virtual environment (.venv)..."';
      hook += '\n  python3 -m venv .venv && . .venv/bin/activate';
      hook += '\nfi';
      hook += '\n';
      hook += '\necho "📦 Installing Python dependencies..."';
      hook += '\nif [ -f requirements.txt ]; then python -m pip install --upgrade pip && python -m pip install -r requirements.txt; fi';
    }

    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      hook += '\necho "📦 Installing Node.js dependencies..."';
      hook += '\nif [ -f package.json ]; then npm install; fi';
    }
    
    if (this.answers.useGeminiCLI) {
      hook += '\n\n# Configure Gemini CLI via npx (works in Devbox/Nix without global install)';
      hook += '\nif command -v gemini >/dev/null 2>&1; then';
      hook += '\n  echo "💎 Gemini CLI found on PATH"';
      hook += '\nelse';
      hook += '\n  echo "💎 Using npx shim for Gemini CLI (no global install)"';
      hook += '\n  alias gemini="npx -y @google/gemini-cli"';
      hook += '\nfi';
      hook += '\necho "Use Oauth login or set your API key: export GEMINI_API_KEY=your_api_key_here"';
    }
    
    if (this.answers.useClaudeCode) {
      hook += '\n\n# Configure Claude Code via npx (no global install)';
      hook += '\nif command -v claude >/dev/null 2>&1; then';
      hook += '\n  echo "🤖 Claude Code found on PATH"';
      hook += '\nelse';
      hook += '\n  echo "🤖 Using npx shim for Claude Code (no global install)"';
      hook += '\n  alias claude="npx -y @anthropic-ai/claude-code"';
      hook += '\nfi';
      hook += '\necho "After setup, you can run: claude doctor"';
      hook += '\necho "Authenticate via Anthropic Console or Claude App as needed"';
    }
    
    return hook;
  }

  getShellScripts() {
    const scripts = {};
    
    if (this.answers.generateScripts) {
      const commands = this.answers.expectedCommands.split(',').map(cmd => cmd.trim());
      
      if (this.answers.useGeminiCLI) {
        commands.forEach(cmd => {
          scripts[`ai_${cmd}`] = `gemini ${cmd}`; // alias set in init_hook to npx
        });
      }
      if (this.answers.useClaudeCode) {
        commands.forEach(cmd => {
          scripts[`ai_${cmd}`] = `claude ${cmd}`; // alias set in init_hook to npx
        });
      }

      // Add common development scripts
      scripts.dev = this.getDevScript();
      scripts.build = this.getBuildScript();
      scripts.test = this.getTestScript();
    }

    return scripts;
  }

  getDevScript() {
    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      return 'npm run dev';
    }
    if (this.answers.language?.includes('Python')) {
      return '. .venv/bin/activate && python src/main.py';
    }
    if (this.answers.language?.includes('Rust')) {
      return 'cargo run';
    }
    return 'echo "Configure your dev command"';
  }

  getBuildScript() {
    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      return 'npm run build';
    }
    if (this.answers.language?.includes('Rust')) {
      return 'cargo build --release';
    }
    if (this.answers.language?.includes('Java')) {
      return 'mvn clean package';
    }
    return 'echo "Configure your build command"';
  }

  getTestScript() {
    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      return 'npm test';
    }
    if (this.answers.language?.includes('Python')) {
      return '. .venv/bin/activate && python -m pytest';
    }
    if (this.answers.language?.includes('Rust')) {
      return 'cargo test';
    }
    if (this.answers.language?.includes('Java')) {
      return 'mvn test';
    }
    return 'echo "Configure your test command"';
  }

  async generateNxSetup(projectPath) {
    console.log('📦 Setting up Nx workspace...');
    
    // Create nx.json
    const nxConfig = {
      extends: 'nx/presets/npm.json',
      targetDefaults: {
        build: { cache: true },
        test: { cache: true },
        lint: { cache: true }
      },
      plugins: this.getNxPlugins()
    };

    fs.writeFileSync(
      path.join(projectPath, 'nx.json'),
      JSON.stringify(nxConfig, null, 2)
    );

    // Create package.json
    const packageJson = {
      name: this.answers.repoName,
      version: '1.0.0',
      description: this.answers.projectDescription || '',
      scripts: {
        build: 'nx build',
        test: 'nx test',
        lint: 'nx lint',
        dev: 'nx serve'
      },
      devDependencies: {
        nx: '^17.0.0'
      }
    };

    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }

  getNxPlugins() {
    const plugins = [];
    
    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      plugins.push('@nx/js', '@nx/web');
    }
    if (this.answers.language?.includes('Java')) {
      plugins.push('@nx/gradle', '@nx/maven');
    }
    
    return plugins;
  }

  async generateDevboxOnlySetup(projectPath) {
    console.log('📁 Setting up simple project structure...');
    
    // Create basic project structure
    const dirs = ['src', 'docs', 'scripts', 'tests'];
    dirs.forEach(dir => {
      fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
    });

    // Create a simple build script
    const buildScript = this.getBuildScriptFile();
    fs.writeFileSync(path.join(projectPath, 'scripts', 'build.sh'), buildScript);
    fs.chmodSync(path.join(projectPath, 'scripts', 'build.sh'), '755');

    // Create a simple main file
    this.createMainFile(projectPath);
  }

  getBuildScriptFile() {
    if (this.answers.language?.includes('Rust')) {
      return '#!/bin/bash\necho "Building Rust project..."\ncargo build --release';
    }
    if (this.answers.language?.includes('Python')) {
      return '#!/bin/bash\necho "Setting up Python project..."\npip install -r requirements.txt\necho "Running tests..."\npython -m pytest tests/';
    }
    if (this.answers.language?.includes('.NET')) {
      return '#!/bin/bash\necho "Building .NET project..."\ndotnet build\ndotnet test';
    }
    if (this.answers.language?.includes('Java')) {
      return '#!/bin/bash\necho "Building Java project..."\nmvn clean compile\nmvn test';
    }
    return '#!/bin/bash\necho "Build script ready for customization"';
  }

  createMainFile(projectPath) {
    let content = '';
    let filename = '';

    if (this.answers.language?.includes('Python')) {
      filename = 'src/main.py';
      content = `#!/usr/bin/env python3
"""
${this.answers.projectDescription}
"""

def main():
    print("Hello, World! 🐍")
    print("Project: ${this.answers.repoName}")

if __name__ == "__main__":
    main()
`;
    } else if (this.answers.language?.includes('JavaScript')) {
      filename = 'src/main.js';
      content = `#!/usr/bin/env node
/**
 * ${this.answers.projectDescription}
 */

function main() {
    console.log("Hello, World! 🚀");
    console.log("Project: ${this.answers.repoName}");
}

if (require.main === module) {
    main();
}

module.exports = { main };
`;
    } else if (this.answers.language?.includes('Rust')) {
      filename = 'src/main.rs';
      content = `//! ${this.answers.projectDescription}

fn main() {
    println!("Hello, World! 🦀");
    println!("Project: ${this.answers.repoName}");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_main() {
        main();
    }
}
`;
    }

    if (content && filename) {
      fs.writeFileSync(path.join(projectPath, filename), content);
    }
  }

  generateRequirementsFiles(projectPath) {
    if (this.answers.language?.includes('Python') && this.answers.specificDependencies) {
      const deps = this.answers.specificDependencies
        .split(',')
        .map(dep => dep.trim())
        .filter(dep => dep.length > 0);

      const requirements = deps.join('\n') + '\n';
      fs.writeFileSync(path.join(projectPath, 'requirements.txt'), requirements);
      
      console.log('📦 Created requirements.txt with your dependencies');
    }

    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      // Package.json is handled in Nx setup or main package.json creation
      if (!this.answers.useNx && this.answers.specificDependencies) {
        const packageJson = {
          name: this.answers.repoName,
          version: '1.0.0',
          description: this.answers.projectDescription,
          main: 'src/main.js',
          scripts: {
            start: 'node src/main.js',
            dev: 'nodemon src/main.js',
            test: 'jest'
          },
          dependencies: {},
          devDependencies: {
            jest: '^29.0.0',
            nodemon: '^3.0.0'
          }
        };

        // Add specific dependencies
        const deps = this.answers.specificDependencies.split(',').map(dep => dep.trim());
        deps.forEach(dep => {
          packageJson.dependencies[dep] = '^1.0.0'; // Latest version
        });

        fs.writeFileSync(
          path.join(projectPath, 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );
      }
    }
  }

  generateAIConfig(projectPath) {
    if (this.answers.useGeminiCLI) {
      const commands = this.answers.expectedCommands.split(',').map(cmd => cmd.trim());
      const geminiConfig = {
        model: "gemini-pro",
        context: this.answers.projectDescription || "Development project",
        project_type: this.answers.projectType,
        language: this.answers.language,
        commands: {}
      };

      // Add command configurations
      commands.forEach(cmd => {
        geminiConfig.commands[cmd] = {
          description: `${cmd.charAt(0).toUpperCase() + cmd.slice(1)} command for ${this.answers.projectType}`,
          context: `Working on a ${this.answers.language} ${this.answers.projectType}`
        };
      });

      fs.writeFileSync(
        path.join(projectPath, '.gemini.json'),
        JSON.stringify(geminiConfig, null, 2)
      );

      // Create installation script
      const installScript = `#!/bin/bash
# Use Gemini via npx (no global install required)
set -euo pipefail

echo "Configuring Gemini CLI access via npx..."
if command -v npm >/dev/null 2>&1; then
  echo "You can invoke Gemini with: npx -y @google/gemini-cli <command>"
  echo "Optionally add a shell alias in your session: alias gemini=\"npx -y @google/gemini-cli\""
else
  echo "⚠️  npm not found. Install Node.js/npm first."
fi

echo "Set your API key before use:"
echo "export GEMINI_API_KEY=your_api_key_here"
`;
      fs.writeFileSync(path.join(projectPath, 'scripts', 'install-gemini.sh'), installScript);
      fs.chmodSync(path.join(projectPath, 'scripts', 'install-gemini.sh'), '755');
    }

    if (this.answers.useClaudeCode) {
      const claudeConfig = {
        model: "claude-sonnet-4",
        project_context: this.answers.projectDescription || "Development project",
        project_type: this.answers.projectType,
        language: this.answers.language,
        preferences: {
          coding_style: "clean and well-documented",
          test_framework: this.getTestFramework()
        }
      };

      fs.writeFileSync(
        path.join(projectPath, '.claude.json'),
        JSON.stringify(claudeConfig, null, 2)
      );

      // Create installation script
      const installScript = `#!/bin/bash
# Use Claude Code via npx (no global install required)
set -euo pipefail

echo "Configuring Claude Code access via npx..."
if command -v npm >/dev/null 2>&1; then
  echo "You can invoke Claude with: npx -y @anthropic-ai/claude-code <command>"
  echo "Optionally add a shell alias in your session: alias claude=\"npx -y @anthropic-ai/claude-code\""
else
  echo "⚠️  npm not found. Install Node.js/npm first."
fi

echo "After setup, you can run: claude doctor"
echo "Authenticate via Anthropic Console or Claude App as needed"
echo "Set your API key if required: export ANTHROPIC_API_KEY=your_api_key_here"
`;
      fs.writeFileSync(path.join(projectPath, 'scripts', 'install-claude.sh'), installScript);
      fs.chmodSync(path.join(projectPath, 'scripts', 'install-claude.sh'), '755');
    }
  }

  getTestFramework() {
    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      return 'jest';
    }
    if (this.answers.language?.includes('Python')) {
      return 'pytest';
    }
    if (this.answers.language?.includes('Rust')) {
      return 'cargo test';
    }
    if (this.answers.language?.includes('Java')) {
      return 'junit';
    }
    return 'custom';
  }

  generateDockerfile(projectPath) {
    let dockerfile = this.getDockerfileContent();
    fs.writeFileSync(path.join(projectPath, 'Dockerfile'), dockerfile);

    // Generate docker-compose.yml for easier development
    const dockerCompose = this.getDockerComposeContent();
    fs.writeFileSync(path.join(projectPath, 'docker-compose.yml'), dockerCompose);

    // Generate .dockerignore
    const dockerignore = this.getDockerIgnoreContent();
    fs.writeFileSync(path.join(projectPath, '.dockerignore'), dockerignore);
  }

  getDockerfileContent() {
    const baseImage = this.getBaseDockerImage();
    
    return `FROM ${baseImage}

WORKDIR /app

${this.getDockerCopyInstructions()}

${this.getDockerBuildInstructions()}

${this.getDockerRunInstructions()}

EXPOSE 3000

CMD ${this.getDockerCmd()}`;
  }

  getBaseDockerImage() {
    if (this.answers.language?.includes('Node') || this.answers.language?.includes('JavaScript')) {
      return this.answers.baseImage?.toLowerCase() === 'alpine' ? 'node:18-alpine' : 'node:18';
    }
    if (this.answers.language?.includes('Java')) {
      return this.answers.baseImage?.toLowerCase() === 'alpine' ? 'openjdk:17-alpine' : 'openjdk:17-jdk';
    }
    if (this.answers.language?.includes('Rust')) {
      return 'rust:1.70';
    }
    if (this.answers.language?.includes('Python')) {
      return this.answers.baseImage?.toLowerCase() === 'alpine' ? 'python:3.11-alpine' : 'python:3.11';
    }
    return this.answers.baseImage?.toLowerCase() === 'alpine' ? 'alpine:latest' : 'ubuntu:22.04';
  }

  getDockerCopyInstructions() {
    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      return 'COPY package*.json ./\nRUN npm install\nCOPY . .';
    }
    if (this.answers.language?.includes('Python')) {
      let instructions = 'COPY requirements.txt ./\n';
      const isAlpine = (this.answers.baseImage?.toLowerCase() === 'alpine');
      if (this.answers.specificDependencies && !isAlpine) {
        // Install system dependencies for common Python packages on Debian/Ubuntu images
        instructions += 'RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*\n';
      }
      instructions += 'RUN pip install -r requirements.txt\nCOPY . .';
      return instructions;
    }
    if (this.answers.language?.includes('Rust')) {
      return 'COPY Cargo.toml Cargo.lock ./\nRUN cargo fetch\nCOPY . .\nRUN cargo build --release';
    }
    if (this.answers.language?.includes('Java')) {
      return 'COPY pom.xml ./\nRUN mvn dependency:resolve\nCOPY . .\nRUN mvn package';
    }
    return 'COPY . .';
  }

  getDockerBuildInstructions() {
    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      return 'RUN npm run build';
    }
    if (this.answers.language?.includes('Python')) {
      return '# Python build completed during dependency installation';
    }
    // Rust and Java builds are handled in copy instructions
    return '# Build completed';
  }

  getDockerRunInstructions() {
    return '# Runtime configuration\nRUN addgroup --system --gid 1001 nodejs\nRUN adduser --system --uid 1001 nextjs\nUSER nextjs';
  }

  getDockerCmd() {
    if (this.answers.language?.includes('JavaScript')) {
      return '["npm", "start"]';
    }
    if (this.answers.language?.includes('Python')) {
      return '["python", "src/main.py"]';
    }
    if (this.answers.language?.includes('Java')) {
      return '["java", "-jar", "target/app.jar"]';
    }
    if (this.answers.language?.includes('Rust')) {
      return '["./target/release/app"]';
    }
    return '["echo", "Configure your startup command"]';
  }

  getDockerComposeContent() {
    return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PYTHONPATH=/app
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - db
  
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=app_db
      - POSTGRES_USER=app_user
      - POSTGRES_PASSWORD=app_password
    volumes:
      - db_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  db_data:
`;
  }

  getDockerIgnoreContent() {
    let content = `# Dependencies
node_modules
pnpm-lock.yaml
yarn.lock
package-lock.json

# Python
__pycache__/
*.py[cod]
.venv
venv/

# Rust
target/

# Java
*.class
*.jar
*.war
target/

# Builds
dist/
build/
out/
coverage/
.nyc_output/

# VCS
.git
.gitignore

# Env
.env
.env.*

# Docker context (exclude local-only files)
Dockerfile
docker-compose.yml
.devcontainer/
`;

    return content;
  }

  generateReadme(projectPath) {
    const readme = `# ${this.answers.repoName || 'Project'}

${this.answers.projectDescription || 'Description of your project'}

## Technology Stack

- **Language**: ${this.answers.language}
- **Project Type**: ${this.answers.projectType}
${this.answers.useNx ? '- **Build System**: Nx' : '- **Build System**: Custom/Simple'}
${this.answers.useGeminiCLI ? '- **AI Assistant**: Gemini CLI' : ''}
${this.answers.useClaudeCode ? '- **AI Assistant**: Claude Code' : ''}

## Getting Started

### Prerequisites

- [Devbox](https://www.jetpack.io/devbox) installed

### Development

1. Clone the repository
2. Enter the development environment:
   \`\`\`bash
   devbox shell
   \`\`\`

${this.answers.useNx ? `3. Run Nx commands:
   \`\`\`bash
   nx build
   nx test
   nx lint
   \`\`\`` : '3. Use the build scripts in ./scripts/'}

${this.answers.createDockerfile ? `

### Docker Deployment

Build and run with Docker:
\`\`\`bash
docker build -t ${this.answers.repoName} .
docker run -p 3000:3000 ${this.answers.repoName}
\`\`\`

Or use Docker Compose:
\`\`\`bash
docker-compose up
\`\`\`` : ''}

${this.answers.useGeminiCLI || this.answers.useClaudeCode ? `

### AI Assistant Usage

${this.answers.useGeminiCLI ? 'Use Gemini CLI for AI-powered development (auto-installed in Devbox if missing):' : 'Use Claude Code for AI-powered development (auto-installed in Devbox if missing):'}
\`\`\`bash
${this.answers.useGeminiCLI ? 'gemini' : 'claude'}
# e.g.
${this.answers.useGeminiCLI ? 'gemini scaffold' : 'claude scaffold'}
${this.answers.useGeminiCLI ? 'gemini build' : 'claude build'}
${this.answers.useGeminiCLI ? 'gemini test' : 'claude test'}
\`\`\`` : ''}

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
`;

    fs.writeFileSync(path.join(projectPath, 'README.md'), readme);
  }

  initializeGit(projectPath) {
    try {
      execSync('git init', { cwd: projectPath });
      
      // Create .gitignore
      const gitignore = this.getGitignoreContent();
      fs.writeFileSync(path.join(projectPath, '.gitignore'), gitignore);
      
      execSync('git add .', { cwd: projectPath });
      execSync('git commit -m "Initial commit: Project setup with wizard"', { cwd: projectPath });
      
      console.log('✅ Git repository initialized');
    } catch (error) {
      console.log('⚠️  Git initialization failed:', error.message);
    }
  }

  getGitignoreContent() {
    let content = `# Dependencies
node_modules/
target/
build/
dist/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/
`;

    if (this.answers.language?.includes('Rust')) {
      content += '\n# Rust\nCargo.lock\ntarget/\n';
    }
    
    if (this.answers.language?.includes('Java')) {
      content += '\n# Java\n*.class\n*.jar\n*.war\ntarget/\n';
    }

    return content;
  }
}

// Run the wizard
const wizard = new ProjectWizard();
wizard.run().catch(console.error);