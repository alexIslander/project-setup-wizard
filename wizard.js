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

      const nxPresets = [
        'TypeScript',
        'Angular',
        'React',
        'Vue',
        'Node',
        'Java',
        '.NET'
      ];

      const nxPresetAnswer = await this.ask(
        'Which Nx technology preset should we use for this workspace?',
        nxPresets,
        this.getDefaultNxPreset()
      );

      const nxPresetIndex = parseInt(nxPresetAnswer) - 1;
      this.answers.nxPreset = (nxPresetIndex >= 0 && nxPresetIndex < nxPresets.length)
        ? nxPresets[nxPresetIndex]
        : nxPresetAnswer;
    }

    // 3. Coding Assistant
    console.log('\n🤖 Coding Assistant');
    console.log('-------------------');

    const assistantOptions = [
      'Gemini CLI',
      'Claude Code',
      'Codex CLI',
      'None'
    ];

    const assistantAnswer = await this.ask(
      'Which coding assistant do you want to use?',
      assistantOptions,
      'Gemini CLI'
    );

    const assistantIndex = parseInt(assistantAnswer) - 1;
    const assistantChoice = (assistantIndex >= 0 && assistantIndex < assistantOptions.length)
      ? assistantOptions[assistantIndex]
      : assistantAnswer;

    const assistantChoiceLower = assistantChoice.toLowerCase();
    this.answers.useGeminiCLI = assistantChoiceLower.includes('gemini');
    this.answers.useClaudeCode = assistantChoiceLower.includes('claude');
    this.answers.useCodexCLI = assistantChoiceLower.includes('codex');

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

  getDefaultNxPreset() {
    const language = this.answers.language || '';
    if (language.includes('.NET')) {
      return '.NET';
    }
    if (language.includes('JavaScript') || language.includes('TypeScript')) {
      return 'TypeScript';
    }
    if (language.includes('Java (')) {
      return 'Java';
    }
    return 'Node';
  }

  isJavaLanguage() {
    const raw = (this.answers.language || '').toLowerCase().trim();
    return raw === 'java'
      || raw.startsWith('java ')
      || raw.startsWith('java(')
      || raw.includes('spring')
      || raw.includes('quarkus');
  }

  getNormalizedNxPreset() {
    const raw = (this.answers.nxPreset || '').toLowerCase();
    if (raw.includes('angular')) {
      return 'angular';
    }
    if (raw.includes('react')) {
      return 'react';
    }
    if (raw.includes('vue')) {
      return 'vue';
    }
    if (raw.includes('node')) {
      return 'node';
    }
    if (raw.includes('.net') || raw.includes('dotnet')) {
      return 'dotnet';
    }
    if (raw.includes('typescript') || raw.includes('javascript')) {
      return 'typescript';
    }
    if (raw === 'java' || raw.startsWith('java ') || raw.startsWith('java(')) {
      return 'java';
    }
    return 'typescript';
  }

  getNxPresetDetails() {
    const presets = {
      typescript: {
        label: 'TypeScript',
        docsUrl: 'https://nx.dev/docs/technologies/typescript/introduction',
        plugins: ['@nx/js'],
        appGenerator: '@nx/js:application',
        libGenerator: '@nx/js:library',
        usesJs: true
      },
      angular: {
        label: 'Angular',
        docsUrl: 'https://nx.dev/docs/technologies/angular/introduction',
        plugins: ['@nx/angular'],
        appGenerator: '@nx/angular:application',
        libGenerator: '@nx/angular:library',
        usesJs: true
      },
      react: {
        label: 'React',
        docsUrl: 'https://nx.dev/docs/technologies/react/introduction',
        plugins: ['@nx/react'],
        appGenerator: '@nx/react:application',
        libGenerator: '@nx/react:library',
        usesJs: true
      },
      vue: {
        label: 'Vue',
        docsUrl: 'https://nx.dev/docs/technologies/vue/introduction',
        plugins: ['@nx/vue'],
        appGenerator: '@nx/vue:application',
        libGenerator: '@nx/vue:library',
        usesJs: true
      },
      node: {
        label: 'Node',
        docsUrl: 'https://nx.dev/docs/technologies/node/introduction',
        plugins: ['@nx/node'],
        appGenerator: '@nx/node:application',
        libGenerator: '@nx/node:library',
        usesJs: true
      },
      java: {
        label: 'Java',
        docsUrl: 'https://nx.dev/docs/technologies/java/introduction',
        plugins: [],
        appGenerator: null,
        libGenerator: null,
        usesJs: false
      },
      dotnet: {
        label: '.NET',
        docsUrl: 'https://nx.dev/docs/technologies/dotnet/introduction',
        plugins: ['@nx-dotnet/core'],
        appGenerator: '@nx-dotnet/core:app',
        libGenerator: '@nx-dotnet/core:lib',
        usesJs: false
      }
    };

    return presets[this.getNormalizedNxPreset()] || presets.typescript;
  }

  getNxPluginVersion(packageName) {
    if (packageName === '@nx-dotnet/core') {
      return '^2.0.0';
    }
    return '^17.0.0';
  }

  getNxPnpmOnlyBuiltDependencies(preset) {
    const packages = ['nx', '@nx/nx'];
    if (preset.usesJs) {
      packages.push('@nx/js');
    }
    preset.plugins.forEach(plugin => packages.push(plugin));
    return [...new Set(packages)];
  }

  getProjectSlug() {
    const raw = (this.answers.repoName || 'my-project').toLowerCase();
    const slug = raw
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/--+/g, '-');
    return slug || 'app';
  }

  getDotnetProjectName() {
    const slug = this.getProjectSlug();
    const parts = slug.split('-').filter(Boolean);
    const name = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    return name || 'App';
  }

  getJavaPackageName() {
    const slug = this.getProjectSlug().replace(/-/g, '');
    return `com.example.${slug || 'app'}`;
  }

  ensureProjectDirs(projectPath) {
    const dirs = ['scripts'];
    dirs.forEach(dir => {
      fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
    });
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

      this.ensureProjectDirs(projectPath);

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
        console.log('  # Gemini CLI available via pnpm dlx alias in Devbox shell');
        console.log('  # If alias not present, use: pnpm dlx @google/gemini-cli');
        console.log('  gemini --help');
      }
      
      if (this.answers.useClaudeCode) {
        console.log('  # Claude Code available via pnpm dlx alias in Devbox shell');
        console.log('  # If alias not present, use: pnpm dlx @anthropic-ai/claude-code');
        console.log('  claude --help');
      }

      if (this.answers.useCodexCLI) {
        console.log('  # Codex CLI available via pnpm dlx alias in Devbox shell');
        console.log('  # If alias not present, use: pnpm dlx @openai/codex');
        console.log('  codex --help');
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
      $schema: 'https://raw.githubusercontent.com/jetpack-io/devbox/main/.schema/devbox.schema.json',
      packages: this.getDevboxPackages(),
      shell: {
        init_hook: [this.getInitHook()],
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
      packages.push('nodejs', 'pnpm');
    }
    if (this.isJavaLanguage()) {
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
      packages.push('nodejs', 'pnpm');
    }

    // Add AI assistant CLI tools
    if (this.answers.useGeminiCLI) {
      packages.push('nodejs');
    }
    if (this.answers.useClaudeCode) {
      packages.push('nodejs'); // Claude Code requires Node.js
    }
    if (this.answers.useCodexCLI) {
      packages.push('nodejs');
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
        'pnpm',
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

    if (this.answers.useNx || this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      hook += '\necho "📦 Installing Node.js dependencies..."';
      hook += '\nif ! command -v pnpm >/dev/null 2>&1; then';
      hook += '\n  if command -v corepack >/dev/null 2>&1; then corepack enable; fi';
      hook += '\nfi';
      hook += '\nif [ -f package.json ]; then pnpm install; fi';
    }
    
    if (this.answers.useGeminiCLI) {
      hook += '\n\n# Configure Gemini CLI via pnpm dlx (works in Devbox/Nix without global install)';
      hook += '\nif command -v gemini >/dev/null 2>&1; then';
      hook += '\n  echo "💎 Gemini CLI found on PATH"';
      hook += '\nelse';
      hook += '\n  echo "💎 Using pnpm dlx shim for Gemini CLI (no global install)"';
      hook += '\n  alias gemini="pnpm dlx @google/gemini-cli"';
      hook += '\nfi';
      hook += '\necho "Use Oauth login or set your API key: export GEMINI_API_KEY=your_api_key_here"';
    }
    
    if (this.answers.useClaudeCode) {
      hook += '\n\n# Configure Claude Code via pnpm dlx (no global install)';
      hook += '\nif command -v claude >/dev/null 2>&1; then';
      hook += '\n  echo "🤖 Claude Code found on PATH"';
      hook += '\nelse';
      hook += '\n  echo "🤖 Using pnpm dlx shim for Claude Code (no global install)"';
      hook += '\n  alias claude="pnpm dlx @anthropic-ai/claude-code"';
      hook += '\nfi';
      hook += '\necho "After setup, you can run: claude doctor"';
      hook += '\necho "Authenticate via Anthropic Console or Claude App as needed"';
    }

    if (this.answers.useCodexCLI) {
      hook += '\n\n# Configure Codex CLI via pnpm dlx (no global install)';
      hook += '\nif command -v codex >/dev/null 2>&1; then';
      hook += '\n  echo "🧠 Codex CLI found on PATH"';
      hook += '\nelse';
      hook += '\n  echo "🧠 Using pnpm dlx shim for Codex CLI (no global install)"';
      hook += '\n  alias codex="pnpm dlx @openai/codex"';
      hook += '\nfi';
      hook += '\necho "Set your API key before use: export OPENAI_API_KEY=your_api_key_here"';
    }
    
    return hook;
  }

  getShellScripts() {
    const scripts = {
      dev: this.getDevScript(),
      build: this.getBuildScript(),
      test: this.getTestScript()
    };

    if (this.answers.generateScripts) {
      const commands = this.answers.expectedCommands.split(',').map(cmd => cmd.trim());
      
      if (this.answers.useGeminiCLI) {
        commands.forEach(cmd => {
          scripts[`ai_${cmd}`] = `gemini ${cmd}`; // alias set in init_hook to pnpm dlx
        });
      }
      if (this.answers.useClaudeCode) {
        commands.forEach(cmd => {
          scripts[`ai_${cmd}`] = `claude ${cmd}`; // alias set in init_hook to pnpm dlx
        });
      }
      if (this.answers.useCodexCLI) {
        commands.forEach(cmd => {
          scripts[`ai_${cmd}`] = `codex ${cmd}`; // alias set in init_hook to pnpm dlx
        });
      }
    }

    return scripts;
  }

  getDevScript() {
    if (this.answers.useNx) {
      return 'pnpm run dev';
    }
    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      return 'pnpm run dev';
    }
    if (this.answers.language?.includes('Python')) {
      return '. .venv/bin/activate && python src/main.py';
    }
    if (this.answers.language?.includes('Rust')) {
      return 'cargo run';
    }
    if (this.isJavaLanguage()) {
      return `mvn -q -DskipTests compile && java -cp target/classes ${this.getJavaPackageName()}.App`;
    }
    if (this.answers.language?.includes('.NET')) {
      return 'dotnet run';
    }
    return 'echo "Configure your dev command"';
  }

  getBuildScript() {
    if (this.answers.useNx) {
      return 'pnpm run build';
    }
    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      return 'pnpm run build';
    }
    if (this.answers.language?.includes('Rust')) {
      return 'cargo build --release';
    }
    if (this.isJavaLanguage()) {
      return 'mvn clean package';
    }
    if (this.answers.language?.includes('.NET')) {
      return 'dotnet build';
    }
    return 'echo "Configure your build command"';
  }

  getTestScript() {
    if (this.answers.useNx) {
      return 'pnpm run test';
    }
    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      return 'pnpm test';
    }
    if (this.answers.language?.includes('Python')) {
      return '. .venv/bin/activate && if ls tests/*.py >/dev/null 2>&1; then python -m pytest tests/; else echo "No tests configured yet"; fi';
    }
    if (this.answers.language?.includes('Rust')) {
      return 'cargo test';
    }
    if (this.isJavaLanguage()) {
      return 'mvn test';
    }
    if (this.answers.language?.includes('.NET')) {
      return 'if ls tests/*.csproj >/dev/null 2>&1; then dotnet test; else echo "No tests configured yet"; fi';
    }
    return 'echo "Configure your test command"';
  }

  async generateNxSetup(projectPath) {
    console.log('📦 Setting up Nx workspace...');
    
    const projectName = this.getProjectSlug();
    const appRoot = path.join(projectPath, 'apps', projectName);
    fs.mkdirSync(path.join(appRoot, 'src'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'libs'), { recursive: true });

    // Create nx.json
    const nxConfig = {
      extends: 'nx/presets/npm.json',
      workspaceLayout: {
        appsDir: 'apps',
        libsDir: 'libs'
      },
      defaultProject: projectName,
      targetDefaults: {
        build: { cache: true },
        test: { cache: true },
        lint: { cache: true }
      }
    };

    fs.writeFileSync(
      path.join(projectPath, 'nx.json'),
      JSON.stringify(nxConfig, null, 2)
    );

    const preset = this.getNxPresetDetails();
    const isJsTs = this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript');
    const devDependencies = {
      nx: '^17.0.0'
    };

    if (preset.usesJs || isJsTs) {
      devDependencies['@nx/js'] = '^17.0.0';
      devDependencies.typescript = '^5.4.0';
    }

    preset.plugins.forEach(plugin => {
      if (!devDependencies[plugin]) {
        devDependencies[plugin] = this.getNxPluginVersion(plugin);
      }
    });

    // Create package.json
    const packageJson = {
      name: this.answers.repoName,
      version: '1.0.0',
      description: this.answers.projectDescription || '',
      scripts: {
        build: `nx build ${projectName}`,
        test: `nx test ${projectName}`,
        lint: `nx lint ${projectName}`,
        dev: `nx serve ${projectName}`,
        start: `nx serve ${projectName}`
      },
      devDependencies,
      pnpm: {
        onlyBuiltDependencies: this.getNxPnpmOnlyBuiltDependencies(preset)
      }
    };

    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const pnpmWorkspace = `packages:
  - "apps/*"
  - "libs/*"
`;
    fs.writeFileSync(path.join(projectPath, 'pnpm-workspace.yaml'), pnpmWorkspace);

    const projectConfig = this.getNxProjectConfig(projectName);
    fs.writeFileSync(
      path.join(appRoot, 'project.json'),
      JSON.stringify(projectConfig, null, 2)
    );

    this.createLanguageScaffold(appRoot, { useNx: true, workspaceRoot: projectPath });

    this.writeNxGenerateScript(projectPath);
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
    this.createLanguageScaffold(projectPath);
  }

  getBuildScriptFile() {
    if (this.answers.language?.includes('Rust')) {
      return '#!/bin/bash\nset -euo pipefail\necho "Building Rust project..."\ncargo build --release';
    }
    if (this.answers.language?.includes('Python')) {
      return '#!/bin/bash\nset -euo pipefail\necho "Setting up Python project..."\nif [ -f requirements.txt ]; then python -m pip install -r requirements.txt; else echo "No requirements.txt found"; fi\necho "Running tests..."\nif ls tests/*.py >/dev/null 2>&1; then python -m pytest tests/; else echo "No tests configured yet"; fi';
    }
    if (this.answers.language?.includes('.NET')) {
      return '#!/bin/bash\nset -euo pipefail\necho "Building .NET project..."\ndotnet build\nif ls tests/*.csproj >/dev/null 2>&1; then dotnet test; else echo "No tests configured yet"; fi';
    }
    if (this.isJavaLanguage()) {
      return '#!/bin/bash\nset -euo pipefail\necho "Building Java project..."\nmvn -q -DskipTests compile\nif [ -d tests ]; then mvn -q test; else echo "No tests configured yet"; fi';
    }
    return '#!/bin/bash\necho "Build script ready for customization"';
  }

  getNxProjectConfig(projectName) {
    const sourceRoot = `apps/${projectName}/src`;
    return {
      name: projectName,
      $schema: '../../node_modules/nx/schemas/project-schema.json',
      projectType: 'application',
      sourceRoot,
      targets: this.getNxTargets(projectName)
    };
  }

  getNxTargets(projectName) {
    const basePath = `apps/${projectName}`;
    const nxPreset = this.getNxPresetDetails();
    const isJsTs = this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript');
    const isPython = this.answers.language?.includes('Python');
    const isRust = this.answers.language?.includes('Rust');
    const isJava = this.isJavaLanguage();
    const isDotnet = this.answers.language?.includes('.NET');
    const useJsTargets = (nxPreset.usesJs || isJsTs) && !isPython && !isRust && !isJava && !isDotnet;

    if (useJsTargets) {
      return {
        build: {
          executor: '@nx/js:tsc',
          options: {
            outputPath: `dist/${basePath}`,
            main: `${basePath}/src/main.ts`,
            tsConfig: `${basePath}/tsconfig.app.json`,
            assets: []
          }
        },
        serve: {
          executor: '@nx/js:node',
          options: {
            buildTarget: `${projectName}:build`
          }
        },
        test: {
          executor: 'nx:run-commands',
          options: {
            command: 'echo "No tests configured yet"',
            cwd: basePath
          }
        },
        lint: {
          executor: 'nx:run-commands',
          options: {
            command: 'echo "No lint configured yet"',
            cwd: basePath
          }
        }
      };
    }

    let buildCommand = 'echo "No build configured yet"';
    let serveCommand = 'echo "No dev command configured yet"';
    let testCommand = 'echo "No tests configured yet"';
    let buildCwd = '.';
    let serveCwd = '.';
    let testCwd = '.';
    let serveDependsOnBuild = false;

    if (isPython) {
      buildCommand = `python -m py_compile ${basePath}/src/main.py`;
      serveCommand = `python ${basePath}/src/main.py`;
      testCommand = `if ls ${basePath}/tests/*.py >/dev/null 2>&1; then python -m pytest ${basePath}/tests; else echo "No tests configured yet"; fi`;
    } else if (isRust) {
      buildCommand = 'cargo build --release';
      serveCommand = 'cargo run';
      testCommand = 'cargo test';
      buildCwd = basePath;
      serveCwd = basePath;
      testCwd = basePath;
    } else if (isJava) {
      buildCommand = 'mvn -q -DskipTests compile';
      serveCommand = `mvn -q -DskipTests compile && java -cp target/classes ${this.getJavaPackageName()}.App`;
      testCommand = 'mvn -q test';
      buildCwd = basePath;
      serveCwd = basePath;
      testCwd = basePath;
    } else if (isDotnet) {
      buildCommand = 'dotnet build';
      serveCommand = 'dotnet run';
      testCommand = 'if ls tests/*.csproj >/dev/null 2>&1; then dotnet test; else echo "No tests configured yet"; fi';
      buildCwd = basePath;
      serveCwd = basePath;
      testCwd = basePath;
    }

    const targets = {
      build: {
        executor: 'nx:run-commands',
        options: {
          command: buildCommand,
          cwd: buildCwd
        }
      },
      serve: {
        executor: 'nx:run-commands',
        options: {
          command: serveCommand,
          cwd: serveCwd
        }
      },
      test: {
        executor: 'nx:run-commands',
        options: {
          command: testCommand,
          cwd: testCwd
        }
      },
      lint: {
        executor: 'nx:run-commands',
        options: {
          command: 'echo "No lint configured yet"'
        }
      }
    };

    if (serveDependsOnBuild) {
      targets.serve.dependsOn = ['build'];
    }

    return targets;
  }

  writeNxGenerateScript(projectPath) {
    const preset = this.getNxPresetDetails();
    const appGenerator = preset.appGenerator || '';
    const libGenerator = preset.libGenerator || '';
    const script = `#!/bin/bash
set -euo pipefail

if command -v nx >/dev/null 2>&1; then
  NX_CMD="nx"
elif command -v pnpm >/dev/null 2>&1; then
  NX_CMD="pnpm exec nx"
else
  echo "nx/pnpm not found. Run pnpm install first."
  exit 1
fi

if [ "$#" -lt 2 ]; then
  echo "Usage: ./scripts/nx-generate.sh <app|lib> <name>"
  echo "Examples:"
  echo "  ./scripts/nx-generate.sh app my-app"
  echo "  ./scripts/nx-generate.sh lib shared-utils"
  echo "Nx preset: ${preset.label}"
  echo "See ${preset.docsUrl} for options."
  exit 1
fi

TYPE="$1"
NAME="$2"
GEN_APP="${appGenerator}"
GEN_LIB="${libGenerator}"

case "$TYPE" in
  app)
    if [ -z "$GEN_APP" ]; then
      echo "No app generator configured for this preset."
      echo "See ${preset.docsUrl} for options."
      exit 1
    fi
    $NX_CMD g "$GEN_APP" "$NAME"
    ;;
  lib)
    if [ -z "$GEN_LIB" ]; then
      echo "No lib generator configured for this preset."
      echo "See ${preset.docsUrl} for options."
      exit 1
    fi
    $NX_CMD g "$GEN_LIB" "$NAME"
    ;;
  *)
    echo "Unknown type: $TYPE (use app or lib)"
    exit 1
    ;;
esac
`;

    const scriptPath = path.join(projectPath, 'scripts', 'nx-generate.sh');
    fs.writeFileSync(scriptPath, script);
    fs.chmodSync(scriptPath, '755');
  }

  createLanguageScaffold(projectPath, options = {}) {
    const isNx = options.useNx;
    const workspaceRoot = options.workspaceRoot || projectPath;
    const isJsTs = this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript');
    const isPython = this.answers.language?.includes('Python');
    const isRust = this.answers.language?.includes('Rust');
    const isJava = this.isJavaLanguage();
    const isDotnet = this.answers.language?.includes('.NET');

    const sourceDir = path.join(projectPath, 'src');
    fs.mkdirSync(sourceDir, { recursive: true });

    if (isPython) {
      const content = `#!/usr/bin/env python3
"""
${this.answers.projectDescription}
"""

def main():
    print("Hello, World! 🐍")
    print("Project: ${this.answers.repoName}")

if __name__ == "__main__":
    main()
`;
      fs.writeFileSync(path.join(sourceDir, 'main.py'), content);
      return;
    }

    if (isJsTs) {
      if (isNx) {
        const baseConfig = {
          compilerOptions: {
            target: 'ES2020',
            module: 'CommonJS',
            moduleResolution: 'Node',
            esModuleInterop: true,
            forceConsistentCasingInFileNames: true,
            strict: true,
            skipLibCheck: true
          }
        };

        const basePath = path.join(workspaceRoot, 'tsconfig.base.json');
        if (!fs.existsSync(basePath)) {
          fs.writeFileSync(basePath, JSON.stringify(baseConfig, null, 2));
        }

        const appConfig = {
          extends: '../../tsconfig.base.json',
          compilerOptions: {
            rootDir: './src',
            outDir: '../../dist/apps/' + path.basename(projectPath)
          },
          include: ['src/**/*.ts']
        };

        fs.writeFileSync(
          path.join(projectPath, 'tsconfig.app.json'),
          JSON.stringify(appConfig, null, 2)
        );

        const appRootConfig = {
          extends: './tsconfig.app.json'
        };

        fs.writeFileSync(
          path.join(projectPath, 'tsconfig.json'),
          JSON.stringify(appRootConfig, null, 2)
        );

        const content = `/**
 * ${this.answers.projectDescription}
 */

function main() {
  console.log('Hello, World!');
  console.log('Project: ${this.answers.repoName}');
}

main();
`;
        fs.writeFileSync(path.join(sourceDir, 'main.ts'), content);
      } else {
        const content = `#!/usr/bin/env node
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
        fs.writeFileSync(path.join(sourceDir, 'main.js'), content);
      }
      return;
    }

    if (isRust) {
      const cargo = `[package]
name = "${this.getProjectSlug()}"
version = "0.1.0"
edition = "2021"

[dependencies]
`;
      fs.writeFileSync(path.join(projectPath, 'Cargo.toml'), cargo);

      const content = `//! ${this.answers.projectDescription}

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
      fs.writeFileSync(path.join(sourceDir, 'main.rs'), content);
      return;
    }

    if (isJava) {
      const packageName = this.getJavaPackageName();
      const packagePath = path.join(projectPath, 'src', 'main', 'java', ...packageName.split('.'));
      fs.mkdirSync(packagePath, { recursive: true });

      const pom = `<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>${packageName.split('.').slice(0, -1).join('.')}</groupId>
  <artifactId>${this.getProjectSlug()}</artifactId>
  <version>0.1.0</version>
  <properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
  </properties>
</project>
`;
      fs.writeFileSync(path.join(projectPath, 'pom.xml'), pom);

      const content = `package ${packageName};

public class App {
  public static void main(String[] args) {
    System.out.println("Hello, World!");
    System.out.println("Project: ${this.answers.repoName}");
  }
}
`;
      fs.writeFileSync(path.join(packagePath, 'App.java'), content);
      return;
    }

    if (isDotnet) {
      const projectName = this.getDotnetProjectName();
      const csproj = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
`;
      fs.writeFileSync(path.join(projectPath, `${projectName}.csproj`), csproj);

      const content = `namespace ${projectName};

internal class Program
{
  private static void Main(string[] args)
  {
    Console.WriteLine("Hello, World!");
    Console.WriteLine("Project: ${this.answers.repoName}");
  }
}
`;
      fs.writeFileSync(path.join(sourceDir, 'Program.cs'), content);
    }
  }

  generateRequirementsFiles(projectPath) {
    const rawDeps = (this.answers.specificDependencies || '')
      .split(',')
      .map(dep => dep.trim())
      .filter(dep => dep.length > 0);

    if (this.answers.language?.includes('Python')) {
      const requirements = rawDeps.length > 0 ? rawDeps.join('\n') + '\n' : '';
      fs.writeFileSync(path.join(projectPath, 'requirements.txt'), requirements);

      if (rawDeps.length > 0) {
        console.log('📦 Created requirements.txt with your dependencies');
      }
    }

    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      if (!this.answers.useNx) {
        const packageJson = {
          name: this.answers.repoName,
          version: '1.0.0',
          description: this.answers.projectDescription,
          main: 'src/main.js',
          scripts: {
            start: 'node src/main.js',
            dev: 'node src/main.js',
            build: 'node src/main.js',
            test: 'echo "No tests configured yet"'
          },
          dependencies: {},
          devDependencies: {}
        };

        rawDeps.forEach(dep => {
          packageJson.dependencies[dep] = '^1.0.0';
        });

        fs.writeFileSync(
          path.join(projectPath, 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );
      } else if (rawDeps.length > 0) {
        const packagePath = path.join(projectPath, 'package.json');
        if (fs.existsSync(packagePath)) {
          const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
          packageJson.dependencies = packageJson.dependencies || {};
          rawDeps.forEach(dep => {
            if (!packageJson.dependencies[dep]) {
              packageJson.dependencies[dep] = '^1.0.0';
            }
          });
          fs.writeFileSync(
            packagePath,
            JSON.stringify(packageJson, null, 2)
          );
        }
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
# Use Gemini via pnpm dlx (no global install required)
set -euo pipefail

echo "Configuring Gemini CLI access via pnpm dlx..."
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable >/dev/null 2>&1 || true
  fi
fi
if command -v pnpm >/dev/null 2>&1; then
  echo "You can invoke Gemini with: pnpm dlx @google/gemini-cli <command>"
  echo "Optionally add a shell alias in your session: alias gemini=\"pnpm dlx @google/gemini-cli\""
else
  echo "⚠️  pnpm not found. Install Node.js (corepack) or pnpm first."
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
# Use Claude Code via pnpm dlx (no global install required)
set -euo pipefail

echo "Configuring Claude Code access via pnpm dlx..."
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable >/dev/null 2>&1 || true
  fi
fi
if command -v pnpm >/dev/null 2>&1; then
  echo "You can invoke Claude with: pnpm dlx @anthropic-ai/claude-code <command>"
  echo "Optionally add a shell alias in your session: alias claude=\"pnpm dlx @anthropic-ai/claude-code\""
else
  echo "⚠️  pnpm not found. Install Node.js (corepack) or pnpm first."
fi

echo "After setup, you can run: claude doctor"
echo "Authenticate via Anthropic Console or Claude App as needed"
echo "Set your API key if required: export ANTHROPIC_API_KEY=your_api_key_here"
`;
      fs.writeFileSync(path.join(projectPath, 'scripts', 'install-claude.sh'), installScript);
      fs.chmodSync(path.join(projectPath, 'scripts', 'install-claude.sh'), '755');
    }

    if (this.answers.useCodexCLI) {
      const codexConfig = {
        model: "gpt-4.1",
        project_context: this.answers.projectDescription || "Development project",
        project_type: this.answers.projectType,
        language: this.answers.language,
        preferences: {
          coding_style: "clean and well-documented",
          test_framework: this.getTestFramework()
        }
      };

      fs.writeFileSync(
        path.join(projectPath, '.codex.json'),
        JSON.stringify(codexConfig, null, 2)
      );

      const installScript = `#!/bin/bash
# Use Codex via pnpm dlx (no global install required)
set -euo pipefail

echo "Configuring Codex CLI access via pnpm dlx..."
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable >/dev/null 2>&1 || true
  fi
fi
if command -v pnpm >/dev/null 2>&1; then
  echo "You can invoke Codex with: pnpm dlx @openai/codex <command>"
  echo "Optionally add a shell alias in your session: alias codex=\\"pnpm dlx @openai/codex\\""
else
  echo "⚠️  pnpm not found. Install Node.js (corepack) or pnpm first."
fi

echo "Set your API key before use:"
echo "export OPENAI_API_KEY=your_api_key_here"
`;
      fs.writeFileSync(path.join(projectPath, 'scripts', 'install-codex.sh'), installScript);
      fs.chmodSync(path.join(projectPath, 'scripts', 'install-codex.sh'), '755');
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
    if (this.isJavaLanguage()) {
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
    if (this.isJavaLanguage()) {
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
      return 'COPY package.json pnpm-lock.yaml* ./\nRUN corepack enable\nRUN pnpm install\nCOPY . .';
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
    if (this.isJavaLanguage()) {
      return 'COPY pom.xml ./\nRUN mvn dependency:resolve\nCOPY . .\nRUN mvn package';
    }
    return 'COPY . .';
  }

  getDockerBuildInstructions() {
    if (this.answers.language?.includes('JavaScript') || this.answers.language?.includes('TypeScript')) {
      return 'RUN pnpm run build';
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
      return '["pnpm", "start"]';
    }
    if (this.answers.language?.includes('Python')) {
      return '["python", "src/main.py"]';
    }
    if (this.isJavaLanguage()) {
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
${this.answers.useCodexCLI ? '- **AI Assistant**: Codex CLI' : ''}

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

${this.answers.useGeminiCLI || this.answers.useClaudeCode || this.answers.useCodexCLI ? `

### AI Assistant Usage

${this.answers.useGeminiCLI ? 'Use Gemini CLI for AI-powered development (auto-installed in Devbox if missing):' : this.answers.useClaudeCode ? 'Use Claude Code for AI-powered development (auto-installed in Devbox if missing):' : 'Use Codex CLI for AI-powered development (auto-installed in Devbox if missing):'}
\`\`\`bash
${this.answers.useGeminiCLI ? 'gemini' : this.answers.useClaudeCode ? 'claude' : 'codex'}
# e.g.
${this.answers.useGeminiCLI ? 'gemini scaffold' : this.answers.useClaudeCode ? 'claude scaffold' : 'codex scaffold'}
${this.answers.useGeminiCLI ? 'gemini build' : this.answers.useClaudeCode ? 'claude build' : 'codex build'}
${this.answers.useGeminiCLI ? 'gemini test' : this.answers.useClaudeCode ? 'claude test' : 'codex test'}
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
    
    if (this.isJavaLanguage()) {
      content += '\n# Java\n*.class\n*.jar\n*.war\ntarget/\n';
    }

    return content;
  }
}

// Run the wizard
const wizard = new ProjectWizard();
wizard.run().catch(console.error);
