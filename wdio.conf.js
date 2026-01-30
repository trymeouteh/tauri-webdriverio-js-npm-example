import { spawn, spawnSync } from 'child_process';
import { readFileSync } from 'fs'
import os from 'os';

let tauriDriver;
let hasExited = false;

export const config = {
	capabilities: [
		{
			'tauri:options': {
				application: './src-tauri/target/debug/' + JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8')).productName,
			},
		},
	],
	
	port: 4444,
	maxInstances: 1,

	specs: ['./tests/*.js'],

	framework: 'mocha',
	mochaOpts: {
		ui: 'tdd',
		timeout: 60000,
	},

	onPrepare: function() {
		tauriOnPrepare();
	},

	beforeSession: function() {
		tauriBeforeSession();
	},

	afterSession: function() {
		//Clean up the "tauri-driver" process we spawned at the start of the session
		tauriCloseDriver();
	},
};

tauriOnShutdown();

//Ensure the Rust project is built since we expect this binary to exist for the webdriverio sessions
function tauriOnPrepare() {
	spawnSync('npx', ['tauri', 'build', '--debug', '--no-bundle'], {
		cwd: import.meta.dirname,
		stdio: 'inherit',
		shell: true,
	});
}

//Ensure we are running "tauri-driver" before the session starts so that we can proxy the webdriverio requests
function tauriBeforeSession() {
	tauriDriver = spawn(os.homedir() + '/.cargo/bin/tauri-driver', [], {
		stdio: [null, process.stdout, process.stderr] 
	});

	tauriDriver.on('error', function(error) {
		console.error('tauri-driver error:', error);
		process.exit(1);
	});

	tauriDriver.on('exit', function(code) {
		if (!hasExited) {
			console.error('tauri-driver exited with code:', code);
			process.exit(1);
		}
	});
}

function tauriCloseDriver() {
	hasExited = true;
	tauriDriver?.kill();
}

function tauriOnShutdown() {
	process.on('exit', tauriCleanup);
	process.on('SIGINT', tauriCleanup);
	process.on('SIGTERM', tauriCleanup);
	process.on('SIGHUP', tauriCleanup);
	process.on('SIGBREAK', tauriCleanup);
}

function tauriCleanup() {
	try {
		tauriCloseDriver();
	} finally {
		process.exit();
	}
};

