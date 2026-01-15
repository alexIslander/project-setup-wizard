#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PRESET_FLAG_MAP = {
  angular: { nxPreset: 'Angular', language: 'JavaScript/TypeScript' },
  react: { nxPreset: 'React', language: 'JavaScript/TypeScript' },
  vue: { nxPreset: 'Vue', language: 'JavaScript/TypeScript' },
  node: { nxPreset: 'Node', language: 'JavaScript/TypeScript' },
  typescript: { nxPreset: 'TypeScript', language: 'JavaScript/TypeScript' },
  java: { nxPreset: 'Java', language: 'Java (Spring Boot/Quarkus)' },
  dotnet: { nxPreset: '.NET', language: '.NET' }
};

const PROJECT_TYPE_FLAG_MAP = {
  'web-app': 'Web app',
  'cli-tool': 'CLI tool',
  library: 'Library',
  'api-service': 'API service',
  'mobile-app': 'Mobile app',
  other: 'Other'
};

class ProjectWizard {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.answers = {};
    this.cliConfig = this.parseCliOptions(process.argv.slice(2));
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

  normalizeOptionAnswer(answer, options) {
    const index = parseInt(answer, 10) - 1;
    if (!Number.isNaN(index) && index >= 0 && index < options.length) {
      return options[index];
    }
    return answer;
  }

  getExpectedCommands() {
    return (this.answers.expectedCommands || '').split(',').map(cmd => cmd.trim());
  }

  getLanguageProfile() {
    const language = this.answers.language || '';
    return {
      language,
      isJsTs: language.includes('JavaScript') || language.includes('TypeScript'),
      isPython: language.includes('Python'),
      isRust: language.includes('Rust'),
      isJava: this.isJavaLanguage(),
      isDotnet: language.includes('.NET')
    };
  }

  parseCliOptions(args) {
    const flags = new Set();
    let projectName = null;
    let dockerOverride = null;
    let dbOverride = null;
    let githubUser = null;
    let javaFramework = null;

    for (let i = 0; i < args.length; i += 1) {
      const arg = args[i];
      if (arg === '-h') {
        flags.add('h');
        continue;
      }
      if (!arg.startsWith('--')) {
        continue;
      }

      const [rawKey, rawValue] = arg.slice(2).split('=');
      const key = rawKey.toLowerCase();

      if (key === 'name' || key === 'project-name') {
        let value = rawValue;
        if (!value) {
          const next = args[i + 1];
          if (next && !next.startsWith('-')) {
            value = next;
            i += 1;
          }
        }
        if (!value) {
          console.error('❌ Please provide a project name after --name.');
          process.exit(1);
        }
        projectName = value.trim();
        continue;
      }

      if (key === 'user' || key === 'github-user') {
        let value = rawValue;
        if (!value) {
          const next = args[i + 1];
          if (next && !next.startsWith('-')) {
            value = next;
            i += 1;
          }
        }
        if (!value) {
          console.error('❌ Please provide a GitHub username after --user.');
          process.exit(1);
        }
        githubUser = value.trim();
        continue;
      }

      if (key === 'docker') {
        if (dockerOverride === false) {
          console.error('❌ Use only one of --docker or --no-docker.');
          process.exit(1);
        }
        dockerOverride = true;
        continue;
      }

      if (key === 'no-docker') {
        if (dockerOverride === true) {
          console.error('❌ Use only one of --docker or --no-docker.');
          process.exit(1);
        }
        dockerOverride = false;
        continue;
      }

      if (key === 'db') {
        if (dbOverride === false) {
          console.error('❌ Use only one of --db or --no-db.');
          process.exit(1);
        }
        dbOverride = true;
        continue;
      }

      if (key === 'no-db') {
        if (dbOverride === true) {
          console.error('❌ Use only one of --db or --no-db.');
          process.exit(1);
        }
        dbOverride = false;
        continue;
      }

      if (key === 'quarkus') {
        if (javaFramework && javaFramework !== 'quarkus') {
          console.error('❌ Use only one of --quarkus or --spring-boot.');
          process.exit(1);
        }
        javaFramework = 'quarkus';
        continue;
      }

      if (key === 'spring-boot') {
        if (javaFramework && javaFramework !== 'spring-boot') {
          console.error('❌ Use only one of --quarkus or --spring-boot.');
          process.exit(1);
        }
        javaFramework = 'spring-boot';
        continue;
      }

      flags.add(key);
    }

    const presetFlags = Object.keys(PRESET_FLAG_MAP).filter(flag => flags.has(flag));
    const projectTypeFlags = Object.keys(PROJECT_TYPE_FLAG_MAP).filter(flag => flags.has(flag));

    if (presetFlags.length > 1) {
      console.error('❌ Please provide only one preset flag (e.g., --angular).');
      process.exit(1);
    }

    if (javaFramework && presetFlags.length === 1 && presetFlags[0] !== 'java') {
      console.error('❌ Java framework flags (--spring-boot/--quarkus) can only be used with --java or alone.');
      process.exit(1);
    }

    if (projectTypeFlags.length > 1) {
      console.error('❌ Please provide only one project type flag (e.g., --web-app).');
      process.exit(1);
    }

    return {
      showHelp: flags.has('help') || flags.has('h'),
      nonInteractive: presetFlags.length > 0 || projectTypeFlags.length > 0
        || projectName !== null || dockerOverride !== null || dbOverride !== null
        || githubUser !== null || javaFramework !== null,
      nxPreset: presetFlags.length ? PRESET_FLAG_MAP[presetFlags[0]].nxPreset : null,
      language: presetFlags.length ? PRESET_FLAG_MAP[presetFlags[0]].language : null,
      projectType: projectTypeFlags.length ? PROJECT_TYPE_FLAG_MAP[projectTypeFlags[0]] : null,
      projectName,
      dockerOverride,
      dbOverride,
      githubUser,
      javaFramework
    };
  }

  applyNonInteractiveDefaults(cliConfig) {
    const defaults = {
      projectType: 'Web app',
      language: 'JavaScript/TypeScript',
      projectDescription: 'A new development project',
      specificDependencies: '',
      expectedCommands: 'scaffold,build,test',
      deploymentTarget: 'Docker container',
      createDockerfile: true,
      baseImage: 'Alpine',
      repoName: 'my-project',
      initGit: true,
      generateReadme: true,
      setupVersioning: true,
      generateScripts: true,
      includeDocs: true,
      useGeminiCLI: false,
      useClaudeCode: false,
      useCodexCLI: false,
      javaFramework: null
    };

    this.answers = { ...defaults };

    if (cliConfig.projectType) {
      this.answers.projectType = cliConfig.projectType;
    }
    if (cliConfig.language) {
      this.answers.language = cliConfig.language;
    }

    if (cliConfig.javaFramework) {
      this.answers.javaFramework = cliConfig.javaFramework;
      if (!this.answers.language || !this.isJavaLanguage()) {
        this.answers.language = 'Java (Spring Boot/Quarkus)';
      }
    }

    if (cliConfig.projectName) {
      this.answers.repoName = cliConfig.projectName;
    }

    if (cliConfig.githubUser) {
      this.answers.githubUser = cliConfig.githubUser;
    }

    if (typeof cliConfig.dockerOverride === 'boolean') {
      this.answers.createDockerfile = cliConfig.dockerOverride;
    }

    const shouldUseNx = this.shouldRecommendNx();
    this.answers.useNx = shouldUseNx;
    this.answers.enableAutomation = shouldUseNx;

    if (cliConfig.nxPreset) {
      this.answers.useNx = true;
      this.answers.enableAutomation = true;
      this.answers.nxPreset = cliConfig.nxPreset;
    } else if (this.answers.useNx) {
      this.answers.nxPreset = this.getDefaultNxPreset();
    }

    const javaDbDefault = this.isJavaLanguage() && this.answers.createDockerfile;
    this.answers.includeDbService = javaDbDefault;
    if (this.answers.createDockerfile && typeof cliConfig.dbOverride === 'boolean') {
      const canIncludeDb = this.shouldOfferDatabaseService();
      if (cliConfig.dbOverride && !canIncludeDb) {
        console.warn('⚠️  Database service is not recommended for this preset. Skipping --db.');
      } else {
        this.answers.includeDbService = cliConfig.dbOverride;
      }
    } else if (!this.answers.createDockerfile && cliConfig.dbOverride) {
      console.warn('⚠️  Docker is disabled. Skipping --db.');
    }
  }

  printHelp() {
    console.log('Usage:');
    console.log('  node wizard.js');
    console.log('  node wizard.js --angular');
    console.log('  node wizard.js --react');
    console.log('  node wizard.js --vue');
    console.log('  node wizard.js --node');
    console.log('  node wizard.js --typescript');
    console.log('  node wizard.js --java');
    console.log('  node wizard.js --spring-boot');
    console.log('  node wizard.js --quarkus');
    console.log('  node wizard.js --dotnet');
    console.log('  node wizard.js --web-app');
    console.log('  node wizard.js --cli-tool');
    console.log('  node wizard.js --library');
    console.log('  node wizard.js --api-service');
    console.log('  node wizard.js --mobile-app');
    console.log('  node wizard.js --other');
    console.log('  node wizard.js --name my-project');
    console.log('  node wizard.js --user my-github-handle');
    console.log('  node wizard.js --docker');
    console.log('  node wizard.js --no-docker');
    console.log('  node wizard.js --db');
    console.log('  node wizard.js --no-db');
    console.log('\nNotes:');
    console.log('  - Any preset/project-type flag runs the wizard in non-interactive mode.');
    console.log('  - --name, --user, --docker/--no-docker, and --db/--no-db also trigger non-interactive mode.');
    console.log('  - All other values use the same defaults as the interactive wizard.');
    console.log('  - You can combine one preset flag with one project-type flag.');
  }

  async run() {
    console.log('🚀 Project Setup Wizard');
    console.log('========================\n');

    if (this.cliConfig.showHelp) {
      this.printHelp();
      this.rl.close();
      return;
    }

    if (this.cliConfig.nonInteractive) {
      console.log('⚙️  Running in non-interactive mode with defaults.\n');
      this.applyNonInteractiveDefaults(this.cliConfig);
      await this.generateProject();
      return;
    }

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
    this.answers.projectType = this.normalizeOptionAnswer(projectTypeAnswer, projectTypes);

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
    
    this.answers.language = this.normalizeOptionAnswer(languageAnswer, languages);

    if (this.isJavaLanguage()) {
      const javaFrameworks = [
        'None (basic Java)',
        'Spring Boot',
        'Quarkus'
      ];
      const frameworkAnswer = await this.ask(
        'Which Java framework do you want to use?',
        javaFrameworks,
        'None (basic Java)'
      );
      const frameworkChoice = this.normalizeOptionAnswer(frameworkAnswer, javaFrameworks);
      this.answers.javaFramework = this.normalizeJavaFramework(frameworkChoice);
    } else {
      this.answers.javaFramework = null;
    }

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

      this.answers.nxPreset = this.normalizeOptionAnswer(nxPresetAnswer, nxPresets);
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
      'None'
    );

    const assistantChoice = this.normalizeOptionAnswer(assistantAnswer, assistantOptions);

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
    
    this.answers.deploymentTarget = this.normalizeOptionAnswer(deploymentAnswer, deploymentTargets);

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
      
      this.answers.baseImage = this.normalizeOptionAnswer(imageAnswer, baseImages);
      if (this.shouldOfferDatabaseService()) {
        const dbDefault = this.isJavaLanguage() ? 'yes' : 'no';
        this.answers.includeDbService = await this.askYesNo(
          'Include a Postgres database service in docker-compose.yml?',
          dbDefault
        );
      } else {
        this.answers.includeDbService = false;
      }
    } else {
      this.answers.includeDbService = false;
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

    this.answers.githubUser = await this.ask(
      'GitHub username for .env (optional):',
      null,
      ''
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

  shouldOfferDatabaseService() {
    if (this.answers.useNx) {
      const preset = this.getNormalizedNxPreset();
      return ['node', 'java', 'dotnet'].includes(preset);
    }
    const profile = this.getLanguageProfile();
    if (profile.isJava || profile.isDotnet) {
      return true;
    }
    const projectType = (this.answers.projectType || '').toLowerCase();
    return profile.isJsTs && projectType.includes('api');
  }

  isJavaLanguage() {
    const raw = (this.answers.language || '').toLowerCase().trim();
    return raw === 'java'
      || raw.startsWith('java ')
      || raw.startsWith('java(')
      || raw.includes('spring')
      || raw.includes('quarkus');
  }

  normalizeJavaFramework(choice) {
    const raw = (choice || '').toLowerCase();
    if (raw.includes('spring')) {
      return 'spring-boot';
    }
    if (raw.includes('quarkus')) {
      return 'quarkus';
    }
    return null;
  }

  getJavaFramework() {
    return this.normalizeJavaFramework(this.answers.javaFramework || '');
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
        appGenerator: '',
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
        appGenerator: '',
        libGenerator: '',
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
      return '2.2.0';
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

  getNxGeneratorDefaults() {
    return {
      typescript: ['--interactive=false'],
      angular: ['--interactive=false'],
      react: ['--interactive=false'],
      vue: ['--interactive=false'],
      node: ['--interactive=false'],
      java: ['--interactive=false'],
      dotnet: ['--interactive=false', '--language="C#"', '--template=webapi']
    };
  }

  getNxGeneratorFlags(presetKey) {
    const defaults = this.getNxGeneratorDefaults();
    return defaults[presetKey] || defaults.typescript;
  }

  getNxTypescriptVersion(presetKey) {
    if (presetKey === 'angular') {
      return '~5.3.3';
    }
    return '^5.4.0';
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

      this.generateEnvFile(projectPath);

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

  buildDevboxConfig() {
    return {
      $schema: 'https://raw.githubusercontent.com/jetpack-io/devbox/main/.schema/devbox.schema.json',
      packages: this.getDevboxPackages(),
      shell: {
        init_hook: [this.getInitHook()],
        scripts: this.getShellScripts()
      }
    };
  }

  generateDevboxConfig(projectPath) {
    const config = this.buildDevboxConfig();
    fs.writeFileSync(
      path.join(projectPath, 'devbox.json'),
      JSON.stringify(config, null, 2)
    );
  }

  getDevboxPackages() {
    const packages = ['git', 'curl', 'wget'];
    const profile = this.getLanguageProfile();
    
    // Language-specific packages
    if (profile.isJsTs) {
      packages.push('nodejs', 'pnpm');
    }
    if (profile.isJava) {
      packages.push('jdk', 'maven');
    }
    if (profile.isRust) {
      packages.push('rustc', 'cargo');
    }
    if (profile.isPython) {
      packages.push('python3');
    }
    if (profile.isDotnet) {
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
    const profile = this.getLanguageProfile();
    
    // Language-specific setup
    if (profile.isPython) {
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

    if (this.answers.useNx || profile.isJsTs) {
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
      const commands = this.getExpectedCommands();
      
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
    const profile = this.getLanguageProfile();
    if (this.answers.useNx) {
      return 'pnpm run dev';
    }
    if (profile.isJsTs) {
      return 'pnpm run dev';
    }
    if (profile.isPython) {
      return '. .venv/bin/activate && python src/main.py';
    }
    if (profile.isRust) {
      return 'cargo run';
    }
    if (profile.isJava) {
      return this.getJavaDevCommand();
    }
    if (profile.isDotnet) {
      return 'dotnet run';
    }
    return 'echo "Configure your dev command"';
  }

  getBuildScript() {
    const profile = this.getLanguageProfile();
    if (this.answers.useNx) {
      return 'pnpm run build';
    }
    if (profile.isJsTs) {
      return 'pnpm run build';
    }
    if (profile.isRust) {
      return 'cargo build --release';
    }
    if (profile.isJava) {
      return this.getJavaBuildCommand();
    }
    if (profile.isDotnet) {
      return 'dotnet build';
    }
    return 'echo "Configure your build command"';
  }

  getTestScript() {
    const profile = this.getLanguageProfile();
    if (this.answers.useNx) {
      return 'pnpm run test';
    }
    if (profile.isJsTs) {
      return 'pnpm test';
    }
    if (profile.isPython) {
      return '. .venv/bin/activate && if ls tests/*.py >/dev/null 2>&1; then python -m pytest tests/; else echo "No tests configured yet"; fi';
    }
    if (profile.isRust) {
      return 'cargo test';
    }
    if (profile.isJava) {
      return this.getJavaTestCommand();
    }
    if (profile.isDotnet) {
      return 'if ls tests/*.csproj >/dev/null 2>&1; then dotnet test; else echo "No tests configured yet"; fi';
    }
    return 'echo "Configure your test command"';
  }

  getJavaDevCommand() {
    const framework = this.getJavaFramework();
    if (framework === 'spring-boot') {
      return 'mvn spring-boot:run';
    }
    if (framework === 'quarkus') {
      return 'JAVA_TOOL_OPTIONS="-Dnet.bytebuddy.experimental=true" mvn quarkus:dev';
    }
    return 'mvn -q -DskipTests package && java -jar target/app.jar';
  }

  getJavaBuildCommand() {
    const framework = this.getJavaFramework();
    if (framework === 'spring-boot' || framework === 'quarkus') {
      if (framework === 'quarkus') {
        return 'JAVA_TOOL_OPTIONS="-Dnet.bytebuddy.experimental=true" mvn -q -DskipTests package';
      }
      return 'mvn -q -DskipTests package';
    }
    return 'mvn -q -DskipTests package';
  }

  getJavaTestCommand() {
    return 'mvn -q test';
  }

  tryGenerateNxApplication(projectPath, projectName, presetKey, preset) {
    if (!preset.appGenerator) {
      console.warn(`⚠️  No Nx generator configured for ${preset.label}. Falling back to minimal scaffold.`);
      return false;
    }

    try {
      execSync('pnpm --version', { stdio: 'ignore' });
    } catch (error) {
      console.warn('⚠️  pnpm not found. Skipping Nx generator and using minimal scaffold.');
      return false;
    }

    const env = {
      ...process.env,
      CI: '1',
      NX_INTERACTIVE: 'false'
    };

    const useDevbox = presetKey === 'dotnet' && this.isDevboxAvailable();
    const runCommand = command =>
      execSync(useDevbox ? `devbox run -- ${command}` : command, { cwd: projectPath, stdio: 'inherit', env });

    try {
      runCommand('pnpm install');
    } catch (error) {
      console.warn('⚠️  pnpm install failed. Skipping Nx generator and using minimal scaffold.');
      return false;
    }

    const flags = this.getNxGeneratorFlags(presetKey);
    const generatorCommand = ['pnpm exec nx g', preset.appGenerator, projectName, ...flags].join(' ');

    try {
      runCommand(generatorCommand);
      return true;
    } catch (error) {
      console.warn('⚠️  Nx generator failed. Falling back to minimal scaffold.');
      return false;
    }
  }

  isDevboxAvailable() {
    try {
      execSync('devbox version', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  async generateNxSetup(projectPath) {
    console.log('📦 Setting up Nx workspace...');
    
    const projectName = this.getProjectSlug();
    const presetKey = this.getNormalizedNxPreset();
    const preset = this.getNxPresetDetails();
    fs.mkdirSync(path.join(projectPath, 'apps'), { recursive: true });
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

    const profile = this.getLanguageProfile();
    const isJsTs = profile.isJsTs;
    const devDependencies = {
      nx: '^17.0.0'
    };

    if (preset.usesJs || isJsTs) {
      devDependencies['@nx/js'] = '^17.0.0';
      devDependencies.typescript = this.getNxTypescriptVersion(presetKey);
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

    this.writeNxGenerateScript(projectPath);

    let generatorSucceeded = false;
    if (this.answers.enableAutomation) {
      generatorSucceeded = this.tryGenerateNxApplication(projectPath, projectName, presetKey, preset);
    }

    if (!generatorSucceeded) {
      const appRoot = path.join(projectPath, 'apps', projectName);
      fs.mkdirSync(path.join(appRoot, 'src'), { recursive: true });

      const projectConfig = this.getNxProjectConfig(projectName);
      fs.writeFileSync(
        path.join(appRoot, 'project.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      this.createLanguageScaffold(appRoot, { useNx: true, workspaceRoot: projectPath });
    }

    this.ensureNxServePort(projectPath, projectName);

    if (presetKey === 'dotnet') {
      this.normalizeDotnetModuleBoundariesTarget(projectPath);
    }
  }

  normalizeDotnetModuleBoundariesTarget(projectPath) {
    const targetPath = path.join(projectPath, 'Directory.Build.targets');
    if (!fs.existsSync(targetPath)) {
      return;
    }
    const content = fs.readFileSync(targetPath, 'utf8');
    let updated = content.replace(
      /node_modules\/\.pnpm\/[^/]+\/node_modules\/@nx-dotnet\/core\/src\/tasks\/check-module-boundaries\.js/g,
      'node_modules/@nx-dotnet/core/src/tasks/check-module-boundaries.js'
    );
    if (!updated.includes('NX_DOTNET_SKIP_MODULE_BOUNDARIES')) {
      updated = updated.replace(
        /<Target Name="CheckNxModuleBoundaries" BeforeTargets="Build">/,
        '<Target Name="CheckNxModuleBoundaries" BeforeTargets="Build" Condition="\'$(NX_DOTNET_SKIP_MODULE_BOUNDARIES)\' != \'1\'">'
      );
    }
    if (updated !== content) {
      fs.writeFileSync(targetPath, updated);
    }
  }

  ensureNxServePort(projectPath, projectName) {
    const preset = this.getNormalizedNxPreset();
    if (!['angular', 'react', 'vue'].includes(preset)) {
      return;
    }

    const projectConfigPath = path.join(projectPath, 'apps', projectName, 'project.json');
    if (!fs.existsSync(projectConfigPath)) {
      return;
    }

    let projectConfig;
    try {
      projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
    } catch (error) {
      console.warn('⚠️  Failed to read Nx project configuration for port update.');
      return;
    }

    const serveTarget = projectConfig.targets?.serve;
    if (!serveTarget) {
      return;
    }

    const executor = serveTarget.executor || '';
    if (!executor.includes('dev-server')) {
      return;
    }

    if (!serveTarget.options) {
      serveTarget.options = {};
    }

    const port = this.getDockerBasePort();
    serveTarget.options.port = port;

    fs.writeFileSync(projectConfigPath, JSON.stringify(projectConfig, null, 2));

    const e2eConfigPath = path.join(projectPath, 'apps', `${projectName}-e2e`, 'cypress.config.ts');
    if (fs.existsSync(e2eConfigPath)) {
      const e2eConfig = fs.readFileSync(e2eConfigPath, 'utf8');
      const updatedConfig = e2eConfig.replace(
        /baseUrl:\s*'http:\/\/localhost:\d+'/,
        `baseUrl: 'http://localhost:${port}'`
      );
      if (updatedConfig !== e2eConfig) {
        fs.writeFileSync(e2eConfigPath, updatedConfig);
      }
    }
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
    const profile = this.getLanguageProfile();
    if (profile.isRust) {
      return '#!/bin/bash\nset -euo pipefail\necho "Building Rust project..."\ncargo build --release';
    }
    if (profile.isPython) {
      return '#!/bin/bash\nset -euo pipefail\necho "Setting up Python project..."\nif [ -f requirements.txt ]; then python -m pip install -r requirements.txt; else echo "No requirements.txt found"; fi\necho "Running tests..."\nif ls tests/*.py >/dev/null 2>&1; then python -m pytest tests/; else echo "No tests configured yet"; fi';
    }
    if (profile.isDotnet) {
      return '#!/bin/bash\nset -euo pipefail\necho "Building .NET project..."\ndotnet build\nif ls tests/*.csproj >/dev/null 2>&1; then dotnet test; else echo "No tests configured yet"; fi';
    }
    if (profile.isJava) {
      return this.getJavaBuildScriptFile();
    }
    return '#!/bin/bash\necho "Build script ready for customization"';
  }

  getJavaBuildScriptFile() {
    const framework = this.getJavaFramework();
    if (framework === 'spring-boot') {
      return '#!/bin/bash\nset -euo pipefail\necho "Building Spring Boot project..."\nmvn -q -DskipTests package\nmvn -q test';
    }
    if (framework === 'quarkus') {
      return '#!/bin/bash\nset -euo pipefail\necho "Building Quarkus project..."\nmvn -q -DskipTests package\nmvn -q test';
    }
    return '#!/bin/bash\nset -euo pipefail\necho "Building Java project..."\nmvn -q -DskipTests package\nmvn -q test';
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
    const profile = this.getLanguageProfile();
    const useJsTargets = (nxPreset.usesJs || profile.isJsTs) && !profile.isPython && !profile.isRust && !profile.isJava && !profile.isDotnet;

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

    if (profile.isPython) {
      buildCommand = `python -m py_compile ${basePath}/src/main.py`;
      serveCommand = `python ${basePath}/src/main.py`;
      testCommand = `if ls ${basePath}/tests/*.py >/dev/null 2>&1; then python -m pytest ${basePath}/tests; else echo "No tests configured yet"; fi`;
    } else if (profile.isRust) {
      buildCommand = 'cargo build --release';
      serveCommand = 'cargo run';
      testCommand = 'cargo test';
      buildCwd = basePath;
      serveCwd = basePath;
      testCwd = basePath;
    } else if (profile.isJava) {
      buildCommand = this.getJavaBuildCommand();
      serveCommand = this.getJavaDevCommand();
      testCommand = this.getJavaTestCommand();
      buildCwd = basePath;
      serveCwd = basePath;
      testCwd = basePath;
    } else if (profile.isDotnet) {
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
    const profile = this.getLanguageProfile();

    const sourceDir = path.join(projectPath, 'src');
    fs.mkdirSync(sourceDir, { recursive: true });

    if (profile.isPython) {
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

    if (profile.isJsTs) {
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

    if (profile.isRust) {
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

    if (profile.isJava) {
      this.createJavaScaffold(projectPath);
      return;
    }

    if (profile.isDotnet) {
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

  createJavaScaffold(projectPath) {
    const framework = this.getJavaFramework();
    if (framework === 'spring-boot') {
      this.createSpringBootScaffold(projectPath);
      return;
    }
    if (framework === 'quarkus') {
      this.createQuarkusScaffold(projectPath);
      return;
    }
    this.createBasicJavaScaffold(projectPath);
  }

  createBasicJavaScaffold(projectPath) {
    const packageName = this.getJavaPackageName();
    const packagePath = path.join(projectPath, 'src', 'main', 'java', ...packageName.split('.'));
    fs.mkdirSync(packagePath, { recursive: true });

    const hasDb = this.answers.includeDbService;
    const dbDependency = hasDb ? `
  <dependencies>
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <version>42.7.4</version>
    </dependency>
  </dependencies>
` : '';

    const pom = `<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>${packageName.split('.').slice(0, -1).join('.')}</groupId>
  <artifactId>${this.getProjectSlug()}</artifactId>
  <version>0.1.0</version>
  <properties>
    <maven.compiler.source>25</maven.compiler.source>
    <maven.compiler.target>25</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
${dbDependency}
  <build>
    <finalName>app</finalName>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-shade-plugin</artifactId>
        <version>3.5.1</version>
        <executions>
          <execution>
            <phase>package</phase>
            <goals>
              <goal>shade</goal>
            </goals>
            <configuration>
              <transformers>
                <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                  <mainClass>${packageName}.App</mainClass>
                </transformer>
              </transformers>
            </configuration>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
`;
    fs.writeFileSync(path.join(projectPath, 'pom.xml'), pom);

    const dbImports = hasDb ? `
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;` : '';

    const dbLogic = hasDb ? `
    runDbCheck();
` : '';

    const dbHelper = hasDb ? `
  private static void runDbCheck() {
    String host = System.getenv("DB_HOST");
    String name = System.getenv("DB_NAME");
    String user = System.getenv("DB_USER");
    String password = System.getenv("DB_PASSWORD");
    String portEnv = System.getenv("DB_PORT");
    if (host == null || name == null || user == null || password == null) {
      System.out.println("DB env not set; skipping database check.");
      return;
    }
    String port = (portEnv == null || portEnv.isBlank()) ? "5432" : portEnv;
    String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + name;
    try (Connection conn = DriverManager.getConnection(jdbcUrl, user, password);
         Statement stmt = conn.createStatement()) {
      stmt.executeUpdate("CREATE TABLE IF NOT EXISTS wizard_health (id SERIAL PRIMARY KEY, checked_at TIMESTAMPTZ NOT NULL DEFAULT now())");
      stmt.executeUpdate("INSERT INTO wizard_health DEFAULT VALUES");
      System.out.println("DB connection ok: " + jdbcUrl);
    } catch (SQLException ex) {
      System.out.println("DB connection failed: " + ex.getMessage());
    }
  }
` : '';

    const content = `package ${packageName};

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;${dbImports}

public class App {
  private static final int DEFAULT_PORT = ${this.getDockerPort()};
  private static final String OPENAPI_JSON =
    "{\\n" +
    "  \\"openapi\\": \\"3.0.3\\",\\n" +
    "  \\"info\\": {\\n" +
    "    \\"title\\": \\"Project Setup Wizard API\\",\\n" +
    "    \\"version\\": \\"0.1.0\\"\\n" +
    "  },\\n" +
    "  \\"paths\\": {\\n" +
    "    \\"/\\": {\\n" +
    "      \\"get\\": {\\n" +
    "        \\"summary\\": \\"Root\\",\\n" +
    "        \\"responses\\": { \\"200\\": { \\"description\\": \\"OK\\" } }\\n" +
    "      }\\n" +
    "    },\\n" +
    "    \\"/health\\": {\\n" +
    "      \\"get\\": {\\n" +
    "        \\"summary\\": \\"Health\\",\\n" +
    "        \\"responses\\": { \\"200\\": { \\"description\\": \\"OK\\" } }\\n" +
    "      }\\n" +
    "    }\\n" +
    "  }\\n" +
    "}\\n";

  public static void main(String[] args) throws Exception {
    System.out.println("Project: ${this.answers.repoName}");
${dbLogic}
    int port = getPort();
    startServer(port);
  }

  private static void startServer(int port) throws IOException {
    try (ServerSocket serverSocket = new ServerSocket(port)) {
      System.out.println("Listening on port " + port);
      while (true) {
        try (Socket socket = serverSocket.accept()) {
          socket.setSoTimeout(2000);
          BufferedReader reader = new BufferedReader(
            new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8)
          );
          OutputStream out = socket.getOutputStream();
          String requestLine = reader.readLine();
          String path = "/";
          if (requestLine != null && !requestLine.isBlank()) {
            String[] parts = requestLine.split(" ");
            if (parts.length >= 2) {
              path = parts[1];
            }
          }
          String line;
          while ((line = reader.readLine()) != null && !line.isEmpty()) {
            // Consume request headers.
          }
          String statusLine = "HTTP/1.1 200 OK";
          String contentType = "text/plain; charset=utf-8";
          String responseBody = "OK";
          if ("/openapi.json".equals(path) || "/swagger.json".equals(path)) {
            contentType = "application/json; charset=utf-8";
            responseBody = OPENAPI_JSON;
          } else if ("/health".equals(path) || "/".equals(path)) {
            responseBody = "OK";
          } else {
            statusLine = "HTTP/1.1 404 Not Found";
            responseBody = "Not Found";
          }
          byte[] body = responseBody.getBytes(StandardCharsets.UTF_8);
          String header = statusLine + "\\r\\n"
            + "Content-Type: " + contentType + "\\r\\n"
            + "Content-Length: " + body.length + "\\r\\n\\r\\n";
          out.write(header.getBytes(StandardCharsets.UTF_8));
          out.write(body);
          out.flush();
        } catch (IOException ex) {
          System.out.println("Request handling failed: " + ex.getMessage());
        }
      }
    }
  }

  private static int getPort() {
    String portEnv = System.getenv("PORT");
    if (portEnv == null || portEnv.isBlank()) {
      return DEFAULT_PORT;
    }
    try {
      return Integer.parseInt(portEnv);
    } catch (NumberFormatException ex) {
      return DEFAULT_PORT;
    }
  }
${dbHelper}
}
`;
    fs.writeFileSync(path.join(packagePath, 'App.java'), content);
  }

  createSpringBootScaffold(projectPath) {
    const packageName = this.getJavaPackageName();
    const basePackage = packageName.split('.').slice(0, -1).join('.');
    const packagePath = path.join(projectPath, 'src', 'main', 'java', ...packageName.split('.'));
    const resourcePath = path.join(projectPath, 'src', 'main', 'resources');
    fs.mkdirSync(packagePath, { recursive: true });
    fs.mkdirSync(resourcePath, { recursive: true });

    const hasDb = this.answers.includeDbService;
    const dbDependencies = hasDb ? `
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <scope>runtime</scope>
    </dependency>` : '';

    const pom = `<project xmlns="http://maven.apache.org/POM/4.0.0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.2</version>
    <relativePath />
  </parent>
  <groupId>${basePackage}</groupId>
  <artifactId>${this.getProjectSlug()}</artifactId>
  <version>0.1.0</version>
  <name>${this.answers.repoName}</name>
  <description>${this.answers.projectDescription}</description>
  <properties>
    <java.version>21</java.version>
    <maven.compiler.release>21</maven.compiler.release>
    <maven.compiler.source>21</maven.compiler.source>
    <maven.compiler.target>21</maven.compiler.target>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springdoc</groupId>
      <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
      <version>2.5.0</version>
    </dependency>${dbDependencies}
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>
  <build>
    <finalName>app</finalName>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
`;
    fs.writeFileSync(path.join(projectPath, 'pom.xml'), pom);

    const dbProperties = hasDb ? `
spring.datasource.url=jdbc:postgresql://\${DB_HOST:localhost}:\${DB_PORT:5432}/\${DB_NAME:app_db}
spring.datasource.username=\${DB_USER:app_user}
spring.datasource.password=\${DB_PASSWORD:app_password}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.open-in-view=false
` : '';

    const appProperties = `server.port=\${PORT:8080}
spring.application.name=${this.getProjectSlug()}
management.endpoints.web.exposure.include=health,info,metrics
management.endpoint.health.show-details=always
springdoc.api-docs.path=/openapi
springdoc.swagger-ui.path=/swagger-ui
logging.level.root=INFO
logging.level.${packageName}=DEBUG${dbProperties}
`;
    fs.writeFileSync(path.join(resourcePath, 'application.properties'), appProperties);

    const appClass = `package ${packageName};

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
  private static final Logger log = LoggerFactory.getLogger(Application.class);

  public static void main(String[] args) {
    log.info("Starting Spring Boot application...");
    SpringApplication.run(Application.class, args);
  }
}
`;
    fs.writeFileSync(path.join(packagePath, 'Application.java'), appClass);

    const apiPath = path.join(packagePath, 'api');
    fs.mkdirSync(apiPath, { recursive: true });

    const helloController = `package ${packageName}.api;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {
  private static final Logger log = LoggerFactory.getLogger(HelloController.class);

  @GetMapping("/api/hello")
  public Map<String, String> hello() {
    log.info("Handling /api/hello request");
    return Map.of("message", "Hello from Spring Boot");
  }
}
`;
    fs.writeFileSync(path.join(apiPath, 'HelloController.java'), helloController);

    const swaggerRedirect = `package ${packageName}.api;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SwaggerRedirectController {
  @GetMapping("/")
  public String redirectToSwagger() {
    return "redirect:/swagger-ui";
  }
}
`;
    fs.writeFileSync(path.join(apiPath, 'SwaggerRedirectController.java'), swaggerRedirect);

    if (hasDb) {
      const modelPath = path.join(packagePath, 'model');
      const repoPath = path.join(packagePath, 'repository');
      fs.mkdirSync(modelPath, { recursive: true });
      fs.mkdirSync(repoPath, { recursive: true });

      const noteEntity = `package ${packageName}.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "notes")
public class Note {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String message;

  @Column(nullable = false, name = "created_at")
  private Instant createdAt;

  protected Note() {}

  public Note(String message) {
    this.message = message;
  }

  @PrePersist
  void onCreate() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }

  public Long getId() {
    return id;
  }

  public String getMessage() {
    return message;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
`;
      fs.writeFileSync(path.join(modelPath, 'Note.java'), noteEntity);

      const noteRepository = `package ${packageName}.repository;

import ${packageName}.model.Note;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteRepository extends JpaRepository<Note, Long> {}
`;
      fs.writeFileSync(path.join(repoPath, 'NoteRepository.java'), noteRepository);

      const noteController = `package ${packageName}.api;

import ${packageName}.model.Note;
import ${packageName}.repository.NoteRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notes")
public class NoteController {
  private static final Logger log = LoggerFactory.getLogger(NoteController.class);
  private final NoteRepository repository;

  public NoteController(NoteRepository repository) {
    this.repository = repository;
  }

  @PostMapping
  public NoteResponse create(@Valid @RequestBody NoteRequest request) {
    Note note = new Note(request.message());
    Note saved = repository.save(note);
    log.info("Stored note id={}", saved.getId());
    return new NoteResponse(saved.getId(), saved.getMessage(), saved.getCreatedAt());
  }

  @GetMapping
  public List<NoteResponse> list() {
    return repository.findAll().stream()
      .map(note -> new NoteResponse(note.getId(), note.getMessage(), note.getCreatedAt()))
      .toList();
  }

  public record NoteRequest(@NotBlank String message) {}

  public record NoteResponse(Long id, String message, Instant createdAt) {}
}
`;
      fs.writeFileSync(path.join(apiPath, 'NoteController.java'), noteController);
    }
  }

  createQuarkusScaffold(projectPath) {
    const packageName = this.getJavaPackageName();
    const basePackage = packageName.split('.').slice(0, -1).join('.');
    const packagePath = path.join(projectPath, 'src', 'main', 'java', ...packageName.split('.'));
    const resourcePath = path.join(projectPath, 'src', 'main', 'resources');
    fs.mkdirSync(packagePath, { recursive: true });
    fs.mkdirSync(resourcePath, { recursive: true });

    const hasDb = this.answers.includeDbService;
    const dbDependencies = hasDb ? `
    <dependency>
      <groupId>io.quarkus</groupId>
      <artifactId>quarkus-hibernate-orm-panache</artifactId>
    </dependency>
    <dependency>
      <groupId>io.quarkus</groupId>
      <artifactId>quarkus-jdbc-postgresql</artifactId>
    </dependency>` : '';

    const pom = `<project xmlns="http://maven.apache.org/POM/4.0.0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>${basePackage}</groupId>
  <artifactId>${this.getProjectSlug()}</artifactId>
  <version>0.1.0</version>
  <properties>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <maven.compiler.release>21</maven.compiler.release>
    <maven.compiler.source>21</maven.compiler.source>
    <maven.compiler.target>21</maven.compiler.target>
    <quarkus.platform.group-id>io.quarkus.platform</quarkus.platform.group-id>
    <quarkus.platform.artifact-id>quarkus-bom</quarkus.platform.artifact-id>
    <quarkus.platform.version>3.15.2</quarkus.platform.version>
  </properties>
  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>\${quarkus.platform.group-id}</groupId>
        <artifactId>\${quarkus.platform.artifact-id}</artifactId>
        <version>\${quarkus.platform.version}</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
  </dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>io.quarkus</groupId>
      <artifactId>quarkus-rest</artifactId>
    </dependency>
    <dependency>
      <groupId>io.quarkus</groupId>
      <artifactId>quarkus-rest-jackson</artifactId>
    </dependency>
    <dependency>
      <groupId>io.quarkus</groupId>
      <artifactId>quarkus-smallrye-openapi</artifactId>
    </dependency>
    <dependency>
      <groupId>io.quarkus</groupId>
      <artifactId>quarkus-swagger-ui</artifactId>
    </dependency>${dbDependencies}
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <groupId>io.quarkus</groupId>
        <artifactId>quarkus-maven-plugin</artifactId>
        <version>\${quarkus.platform.version}</version>
        <extensions>true</extensions>
        <executions>
          <execution>
            <goals>
              <goal>build</goal>
              <goal>generate-code</goal>
              <goal>generate-code-tests</goal>
            </goals>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
`;
    fs.writeFileSync(path.join(projectPath, 'pom.xml'), pom);

    const dbProperties = hasDb ? `
quarkus.datasource.db-kind=postgresql
quarkus.datasource.username=\${DB_USER:app_user}
quarkus.datasource.password=\${DB_PASSWORD:app_password}
quarkus.datasource.jdbc.url=jdbc:postgresql://\${DB_HOST:localhost}:\${DB_PORT:5432}/\${DB_NAME:app_db}
quarkus.hibernate-orm.database.generation=update
quarkus.hibernate-orm.log.sql=true
` : '';

    const appProperties = `quarkus.http.port=\${PORT:8080}
quarkus.http.host=0.0.0.0
quarkus.log.level=INFO
quarkus.log.category."${packageName}".level=DEBUG
quarkus.smallrye-openapi.info-title=${this.answers.repoName}
quarkus.smallrye-openapi.info-version=0.1.0
quarkus.swagger-ui.always-include=true${dbProperties}
`;
    fs.writeFileSync(path.join(resourcePath, 'application.properties'), appProperties);

    const helloResource = `package ${packageName}.api;

import java.util.Map;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.jboss.logging.Logger;

@Path("/api/hello")
@Produces(MediaType.APPLICATION_JSON)
public class HelloResource {
  private static final Logger log = Logger.getLogger(HelloResource.class);

  @GET
  public Map<String, String> hello() {
    log.info("Handling /api/hello request");
    return Map.of("message", "Hello from Quarkus");
  }
}
`;
    const apiPath = path.join(packagePath, 'api');
    fs.mkdirSync(apiPath, { recursive: true });
    fs.writeFileSync(path.join(apiPath, 'HelloResource.java'), helloResource);

    const healthResource = `package ${packageName}.api;

import java.util.Map;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/api/health")
@Produces(MediaType.APPLICATION_JSON)
public class HealthResource {
  @GET
  public Map<String, String> health() {
    return Map.of("status", "UP");
  }
}
`;
    fs.writeFileSync(path.join(apiPath, 'HealthResource.java'), healthResource);

    const swaggerRedirect = `package ${packageName}.api;

import java.net.URI;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Response;

@Path("/")
public class SwaggerRedirectResource {
  @GET
  public Response redirectToSwagger() {
    return Response.seeOther(URI.create("/q/swagger-ui")).build();
  }
}
`;
    fs.writeFileSync(path.join(apiPath, 'SwaggerRedirectResource.java'), swaggerRedirect);

    if (hasDb) {
      const modelPath = path.join(packagePath, 'model');
      fs.mkdirSync(modelPath, { recursive: true });

      const noteEntity = `package ${packageName}.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "notes")
public class Note extends PanacheEntity {
  @Column(nullable = false)
  public String message;

  @Column(nullable = false, name = "created_at")
  public Instant createdAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
`;
      fs.writeFileSync(path.join(modelPath, 'Note.java'), noteEntity);

      const noteResource = `package ${packageName}.api;

import ${packageName}.model.Note;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import org.jboss.logging.Logger;

@Path("/api/notes")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class NoteResource {
  private static final Logger log = Logger.getLogger(NoteResource.class);

  @POST
  @Transactional
  public Note create(NoteRequest request) {
    Note note = new Note();
    note.message = request.message;
    note.persist();
    log.infof("Stored note id=%d", note.id);
    return note;
  }

  @GET
  public List<Note> list() {
    return Note.listAll();
  }

  public static class NoteRequest {
    public String message;
  }
}
`;
      fs.writeFileSync(path.join(apiPath, 'NoteResource.java'), noteResource);
    }
  }

  generateRequirementsFiles(projectPath) {
    const rawDeps = (this.answers.specificDependencies || '')
      .split(',')
      .map(dep => dep.trim())
      .filter(dep => dep.length > 0);
    const profile = this.getLanguageProfile();

    if (profile.isPython) {
      const requirements = rawDeps.length > 0 ? rawDeps.join('\n') + '\n' : '';
      fs.writeFileSync(path.join(projectPath, 'requirements.txt'), requirements);

      if (rawDeps.length > 0) {
        console.log('📦 Created requirements.txt with your dependencies');
      }
    }

    if (profile.isJsTs) {
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

  buildGeminiConfig(commands) {
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

    return geminiConfig;
  }

  buildGeminiInstallScript() {
    return `#!/bin/bash
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
  }

  buildClaudeConfig() {
    return {
      model: "claude-sonnet-4",
      project_context: this.answers.projectDescription || "Development project",
      project_type: this.answers.projectType,
      language: this.answers.language,
      preferences: {
        coding_style: "clean and well-documented",
        test_framework: this.getTestFramework()
      }
    };
  }

  buildClaudeInstallScript() {
    return `#!/bin/bash
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
  }

  buildCodexConfig() {
    return {
      model: "gpt-4.1",
      project_context: this.answers.projectDescription || "Development project",
      project_type: this.answers.projectType,
      language: this.answers.language,
      preferences: {
        coding_style: "clean and well-documented",
        test_framework: this.getTestFramework()
      }
    };
  }

  buildCodexInstallScript() {
    return `#!/bin/bash
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
  echo "Optionally add a shell alias in your session: alias codex=\"pnpm dlx @openai/codex\""
else
  echo "⚠️  pnpm not found. Install Node.js (corepack) or pnpm first."
fi

echo "Set your API key before use:"
echo "export OPENAI_API_KEY=your_api_key_here"
`;
  }

  generateAIConfig(projectPath) {
    const commands = this.getExpectedCommands();
    if (this.answers.useGeminiCLI) {
      const geminiConfig = this.buildGeminiConfig(commands);

      fs.writeFileSync(
        path.join(projectPath, '.gemini.json'),
        JSON.stringify(geminiConfig, null, 2)
      );

      // Create installation script
      const installScript = this.buildGeminiInstallScript();
      fs.writeFileSync(path.join(projectPath, 'scripts', 'install-gemini.sh'), installScript);
      fs.chmodSync(path.join(projectPath, 'scripts', 'install-gemini.sh'), '755');
    }

    if (this.answers.useClaudeCode) {
      const claudeConfig = this.buildClaudeConfig();

      fs.writeFileSync(
        path.join(projectPath, '.claude.json'),
        JSON.stringify(claudeConfig, null, 2)
      );

      // Create installation script
      const installScript = this.buildClaudeInstallScript();
      fs.writeFileSync(path.join(projectPath, 'scripts', 'install-claude.sh'), installScript);
      fs.chmodSync(path.join(projectPath, 'scripts', 'install-claude.sh'), '755');
    }

    if (this.answers.useCodexCLI) {
      const codexConfig = this.buildCodexConfig();

      fs.writeFileSync(
        path.join(projectPath, '.codex.json'),
        JSON.stringify(codexConfig, null, 2)
      );

      const installScript = this.buildCodexInstallScript();
      fs.writeFileSync(path.join(projectPath, 'scripts', 'install-codex.sh'), installScript);
      fs.chmodSync(path.join(projectPath, 'scripts', 'install-codex.sh'), '755');
    }
  }

  getTestFramework() {
    const profile = this.getLanguageProfile();
    if (profile.isJsTs) {
      return 'jest';
    }
    if (profile.isPython) {
      return 'pytest';
    }
    if (profile.isRust) {
      return 'cargo test';
    }
    if (profile.isJava) {
      return 'junit';
    }
    return 'custom';
  }

  generateDockerfile(projectPath) {
    let dockerfile = this.buildDockerfileContent();
    fs.writeFileSync(path.join(projectPath, 'Dockerfile'), dockerfile);

    // Generate docker-compose.yml for easier development
    const dockerCompose = this.buildDockerComposeContent();
    fs.writeFileSync(path.join(projectPath, 'docker-compose.yml'), dockerCompose);

    // Generate .dockerignore
    const dockerignore = this.buildDockerIgnoreContent();
    fs.writeFileSync(path.join(projectPath, '.dockerignore'), dockerignore);
  }

  buildDockerfileContent() {
    const profile = this.getLanguageProfile();
    if (profile.isJava) {
      return this.buildJavaDockerfileContent();
    }
    const baseImage = this.getBaseDockerImage();
    const port = this.getDockerPort();
    
    return `FROM ${baseImage}

WORKDIR /app

ENV PORT=${port}

${this.getDockerCopyInstructions()}

${this.getDockerBuildInstructions()}

${this.getDockerRunInstructions()}

EXPOSE ${port}

CMD ${this.getDockerCmd()}`;
  }

  buildJavaDockerfileContent() {
    const port = this.getDockerPort();
    const projectName = this.getProjectSlug();
    const javaFramework = this.getJavaFramework();
    if (javaFramework === 'quarkus') {
      return `# Stage 1: Build
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*
ENV JAVA_TOOL_OPTIONS="-Dnet.bytebuddy.experimental=true"
COPY . .
RUN if [ -f apps/${projectName}/pom.xml ]; then mvn -q -DskipTests -f apps/${projectName}/pom.xml package; else mvn -q -DskipTests package; fi
RUN if [ -d apps/${projectName}/target/quarkus-app ]; then cp -R apps/${projectName}/target/quarkus-app /app/quarkus-app; else cp -R target/quarkus-app /app/quarkus-app; fi

# Stage 2: Final image
FROM eclipse-temurin:25-jdk
WORKDIR /app
ENV PORT=${port}
COPY --from=build /app/quarkus-app /app/quarkus-app
EXPOSE ${port}
ENTRYPOINT ["java", "-jar", "/app/quarkus-app/quarkus-run.jar"]`;
    }
    if (javaFramework === 'spring-boot') {
      return `# Stage 1: Build
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*
COPY . .
RUN if [ -f apps/${projectName}/pom.xml ]; then mvn -q -DskipTests -f apps/${projectName}/pom.xml package; else mvn -q -DskipTests package; fi
RUN if [ -f apps/${projectName}/target/app.jar ]; then cp apps/${projectName}/target/app.jar /app/app.jar; else cp target/app.jar /app/app.jar; fi

# Stage 2: Final image
FROM eclipse-temurin:25-jdk
WORKDIR /app
ENV PORT=${port}
COPY --from=build /app/app.jar /app/app.jar
EXPOSE ${port}
ENTRYPOINT ["java", "-jar", "/app/app.jar"]`;
    }
    return `# Stage 1: Build
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*
COPY . .
RUN if [ -f apps/${projectName}/pom.xml ]; then mvn -q -DskipTests -f apps/${projectName}/pom.xml package; else mvn -q -DskipTests package; fi
RUN if [ -f apps/${projectName}/target/app.jar ]; then cp apps/${projectName}/target/app.jar /app/app.jar; else cp target/app.jar /app/app.jar; fi

# Stage 2: Minimal runtime
FROM eclipse-temurin:25-jdk AS jlink
RUN $JAVA_HOME/bin/jlink \\
  --module-path $JAVA_HOME/jmods \\
  --add-modules java.base,java.logging,java.xml,java.naming,java.sql,java.management,jdk.unsupported \\
  --output /javaruntime \\
  --compress=2 --no-header-files --no-man-pages

# Stage 3: Final image
FROM debian:bookworm-slim
WORKDIR /app
COPY --from=jlink /javaruntime /opt/java-minimal
ENV PATH="/opt/java-minimal/bin:$PATH"
ENV PORT=${port}
COPY --from=build /app/app.jar /app/app.jar
EXPOSE ${port}
ENTRYPOINT ["java", "-jar", "/app/app.jar"]`;
  }

  getBaseDockerImage() {
    const profile = this.getLanguageProfile();
    if (this.answers.language?.includes('Node') || profile.isJsTs) {
      return this.answers.baseImage?.toLowerCase() === 'alpine' ? 'node:18-alpine' : 'node:18';
    }
    if (profile.isDotnet) {
      return 'mcr.microsoft.com/dotnet/sdk:8.0';
    }
    if (profile.isJava) {
      return 'eclipse-temurin:25-jdk';
    }
    if (profile.isRust) {
      return 'rust:1.70';
    }
    if (profile.isPython) {
      return this.answers.baseImage?.toLowerCase() === 'alpine' ? 'python:3.11-alpine' : 'python:3.11';
    }
    return this.answers.baseImage?.toLowerCase() === 'alpine' ? 'alpine:latest' : 'ubuntu:22.04';
  }

  getDockerCopyInstructions() {
    const profile = this.getLanguageProfile();
    if (profile.isJsTs) {
      return 'COPY package.json pnpm-lock.yaml* ./\nRUN corepack enable\nRUN pnpm install\nCOPY . .';
    }
    if (profile.isPython) {
      let instructions = 'COPY requirements.txt ./\n';
      const isAlpine = (this.answers.baseImage?.toLowerCase() === 'alpine');
      if (this.answers.specificDependencies && !isAlpine) {
        // Install system dependencies for common Python packages on Debian/Ubuntu images
        instructions += 'RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*\n';
      }
      instructions += 'RUN pip install -r requirements.txt\nCOPY . .';
      return instructions;
    }
    if (profile.isRust) {
      return 'COPY Cargo.toml Cargo.lock ./\nRUN cargo fetch\nCOPY . .\nRUN cargo build --release';
    }
    if (profile.isJava) {
      const projectName = this.getProjectSlug();
      return `RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*\nCOPY . .\nRUN if [ -f apps/${projectName}/pom.xml ]; then mvn -q -DskipTests -f apps/${projectName}/pom.xml package; else mvn -q -DskipTests package; fi`;
    }
    return 'COPY . .';
  }

  getDockerBuildInstructions() {
    const profile = this.getLanguageProfile();
    if (profile.isJsTs) {
      return 'RUN pnpm run build';
    }
    if (profile.isPython) {
      return '# Python build completed during dependency installation';
    }
    if (profile.isDotnet) {
      const projectName = this.getDotnetProjectName();
      const projectPath = `apps/${this.getProjectSlug()}/${projectName}.csproj`;
      return `ENV NX_DOTNET_SKIP_MODULE_BOUNDARIES=1\nRUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*\nRUN npm install -g pnpm\nRUN pnpm install\nRUN dotnet restore ${projectPath}\nRUN dotnet build ${projectPath} -c Release`;
    }
    // Rust and Java builds are handled in copy instructions
    return '# Build completed';
  }

  getDockerRunInstructions() {
    return '# Runtime configuration';
  }

  getDockerCmd() {
    const port = this.getDockerPort();
    const profile = this.getLanguageProfile();
    if (this.answers.useNx) {
      const preset = this.getNormalizedNxPreset();
      if (['angular', 'react', 'vue'].includes(preset)) {
        const projectName = this.getProjectSlug();
        return `["pnpm", "nx", "serve", "${projectName}", "--host", "0.0.0.0", "--port", "${port}"]`;
      }
    }
    if (profile.language.includes('JavaScript') || profile.isJsTs) {
      return '["pnpm", "start"]';
    }
    if (profile.isPython) {
      return '["python", "src/main.py"]';
    }
    if (profile.isJava) {
      const javaFramework = this.getJavaFramework();
      const projectName = this.getProjectSlug();
      if (javaFramework === 'quarkus') {
        return `["sh", "-c", "if [ -f apps/${projectName}/target/quarkus-app/quarkus-run.jar ]; then java -jar apps/${projectName}/target/quarkus-app/quarkus-run.jar; else java -jar target/quarkus-app/quarkus-run.jar; fi"]`;
      }
      return `["sh", "-c", "if [ -f apps/${projectName}/target/app.jar ]; then java -jar apps/${projectName}/target/app.jar; else java -jar target/app.jar; fi"]`;
    }
    if (profile.isDotnet) {
      const projectName = this.getDotnetProjectName();
      const projectPath = `apps/${this.getProjectSlug()}/${projectName}.csproj`;
      return `["dotnet", "run", "--project", "${projectPath}", "--urls", "http://0.0.0.0:${port}"]`;
    }
    if (profile.isRust) {
      return '["./target/release/app"]';
    }
    return '["echo", "Configure your startup command"]';
  }

  getDockerPort() {
    return this.getDockerBasePort() + 1;
  }

  getDockerBasePort() {
    if (this.answers.useNx) {
      const preset = this.getNormalizedNxPreset();
      const nxPorts = {
        angular: 4200,
        react: 3000,
        vue: 5173,
        node: 3000,
        typescript: 3000,
        java: 8080,
        dotnet: 5000
      };
      return nxPorts[preset] || 3000;
    }

    const profile = this.getLanguageProfile();
    if (profile.isJava) {
      return 8080;
    }
    if (profile.isDotnet) {
      return 5000;
    }
    if (profile.isPython) {
      return 8000;
    }
    if (profile.isRust) {
      return 3000;
    }
    if (profile.isJsTs) {
      return 3000;
    }
    return 3000;
  }

  buildDockerComposeContent() {
    const includeDb = this.answers.includeDbService;
    const port = this.getDockerPort();
    const dependsOn = includeDb ? '    depends_on:\n      - db\n' : '';
    const dbEnv = includeDb ? `      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=app_db
      - DB_USER=app_user
      - DB_PASSWORD=app_password
      - DATABASE_URL=postgresql://app_user:app_password@db:5432/app_db
` : '';
    const volumes = this.getDockerComposeVolumes();
    const dbService = includeDb ? `
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
` : '';
    const volumeBlock = includeDb ? `
volumes:
  db_data:
` : '';

    return `services:
  app:
    build: .
    ports:
      - "${port}:${port}"
    environment:
      - NODE_ENV=development
      - PYTHONPATH=/app
      - PORT=${port}
${dbEnv}
${volumes}
${dependsOn}${dbService}${volumeBlock}`;
  }

  getDockerComposeVolumes() {
    const profile = this.getLanguageProfile();
    if (profile.isJsTs) {
      return `    volumes:
      - .:/app
      - /app/node_modules
`;
    }
    if (profile.isPython) {
      return `    volumes:
      - .:/app
`;
    }
    return '';
  }

  buildDockerIgnoreContent() {
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

  buildReadmeContent() {
    const dockerPort = this.getDockerPort();
    const javaReadme = this.buildJavaReadmeSection();
    return `# ${this.answers.repoName || 'Project'}

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
docker run -p ${dockerPort}:${dockerPort} ${this.answers.repoName}
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

${javaReadme}

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
`;
  }

  getJavaFrameworkLabel() {
    const framework = this.getJavaFramework();
    if (framework === 'spring-boot') {
      return 'Spring Boot';
    }
    if (framework === 'quarkus') {
      return 'Quarkus';
    }
    return 'Basic Java';
  }

  buildJavaReadmeSection() {
    if (!this.isJavaLanguage()) {
      return '';
    }

    const framework = this.getJavaFramework();
    const label = this.getJavaFrameworkLabel();
    const localPort = this.getDockerBasePort();
    const dockerPort = this.getDockerPort();
    const hasDb = this.answers.includeDbService;

    let swaggerUi = `http://localhost:${localPort}/swagger.json`;
    let openApi = `http://localhost:${localPort}/openapi.json`;
    if (framework === 'spring-boot') {
      swaggerUi = `http://localhost:${localPort}/swagger-ui`;
      openApi = `http://localhost:${localPort}/openapi`;
    } else if (framework === 'quarkus') {
      swaggerUi = `http://localhost:${localPort}/q/swagger-ui`;
      openApi = `http://localhost:${localPort}/q/openapi`;
    }

    const dockerSwaggerUi = swaggerUi.replace(`:${localPort}`, `:${dockerPort}`);
    const dockerOpenApi = openApi.replace(`:${localPort}`, `:${dockerPort}`);

    const dbSection = hasDb ? `
### Database Example

Write a note to Postgres:
\`\`\`bash
curl -X POST http://localhost:${localPort}/api/notes \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Hello from the wizard"}'
\`\`\`

List notes:
\`\`\`bash
curl http://localhost:${localPort}/api/notes
\`\`\`
` : '';

    let references = '';
    if (framework === 'quarkus') {
      references = `
- https://quarkus.io/get-started/
- https://quarkus.io/guides/rest-json
- https://quarkus.io/guides/openapi-swaggerui
`;
    } else if (framework === 'spring-boot') {
      references = `
- https://www.springboottutorial.com/spring-boot-starter-projects
- https://www.baeldung.com/category/spring-boot/tag/spring-annotations
- https://www.baeldung.com/spring-boot-actuator-enable-endpoints
- https://www.baeldung.com/java-spring-security-permit-swagger-ui
- https://www.baeldung.com/spring-boot-data-sql-and-schema-sql
`;
    }

    const jvmTarget = framework === 'quarkus' || framework === 'spring-boot' ? '21 (runs on Java 25)' : '25';
    return `

## Java Framework

- **Framework**: ${label}
- **JVM Target**: ${jvmTarget}
- **Swagger UI**: ${swaggerUi} (Docker: ${dockerSwaggerUi})
- **OpenAPI JSON**: ${openApi} (Docker: ${dockerOpenApi})
${framework === 'spring-boot' ? '- **Actuator Health**: http://localhost:' + localPort + '/actuator/health' : ''}
${dbSection}
${references ? '### References\n' + references : ''}
`;
  }

  generateReadme(projectPath) {
    const readme = this.buildReadmeContent();
    fs.writeFileSync(path.join(projectPath, 'README.md'), readme);
  }

  generateEnvFile(projectPath) {
    const githubUser = (this.answers.githubUser || '').trim();
    if (!githubUser) {
      return;
    }

    const envPath = path.join(projectPath, '.env');
    const entry = `GITHUB_USER=${githubUser}\n`;

    if (fs.existsSync(envPath)) {
      const existing = fs.readFileSync(envPath, 'utf8');
      if (existing.includes('GITHUB_USER=')) {
        return;
      }
      const needsNewline = existing.length > 0 && !existing.endsWith('\n');
      fs.appendFileSync(envPath, `${needsNewline ? '\n' : ''}${entry}`);
      return;
    }

    fs.writeFileSync(envPath, entry);
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
.nx/
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
