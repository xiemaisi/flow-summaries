#!/usr/bin/env node

let fs = require('fs');
let path = require('path');
let child_process = require('child_process');

let projects = path.join(process.env.ODASA_HOME, 'projects'),
    home = require('os').homedir(),
    trapCache = path.join(home, 'trap-cache'),
    suite = path.join(home, 'code/ql/javascript/config/suites/lgtm/javascript-flow-summaries');

if (!fs.statSync(projects).isDirectory()) {
    console.error("No project directory found at " + projects);
    process.exit(-1);
}

if (!fs.statSync(suite).isFile()) {
    console.error("No suite file found at " + suite);
    process.exit(-1);
}

let rootDir = process.cwd(),
    additionalSources = path.join(rootDir, 'additional-sources.csv'),
    additionalSinks = path.join(rootDir, 'additional-sinks.csv');

function proc(pkg, isRoot, org) {
    console.log("Processing " + pkg);
    if (path.basename(pkg)[0] === '@') {
	// this is an org scope; recursively process packages
	for (let child of fs.readdirSync(pkg)) {
	    proc(path.join(pkg, child), false, path.basename(pkg));
	}
    } else if (!fs.existsSync(path.join(pkg, 'package.json'))) {
	console.warn(pkg + " does not seem to be an npm package; skipping.");
    } else {
	let node_modules = path.join(pkg, 'node_modules');
	if (fs.existsSync(node_modules)) {
	    for (let child of fs.readdirSync(node_modules)) {
		// skip `.bin`
		if (child[0] === '.')
		    continue;
		proc(path.join(node_modules, child));
	    }
	} else {
	    console.log("No further dependencies");
	}

	if (!isRoot) {
	    let pkgName = (org ? org + "-" : "") + path.basename(pkg);
	    let projectDir = path.join(projects, pkgName);
	    if (fs.existsSync(projectDir)) {
		console.log("Package " + pkgName + " already built.");
	    } else {
		console.log("Building package " + pkgName);
		fs.mkdirSync(projectDir);
		fs.writeFileSync(path.join(projectDir, 'project'),
`<project language="javascript">
  <ram>6144</ram>
  <timeout>1200</timeout>
  <autoupdate>
    <source-location>${pkg}</source-location>
    <build>java -jar \${odasa_tools}/extractor-javascript.jar --externs --trap-cache ${trapCache} \${odasa_tools}/data/externs</build>
    <build>java -Xmx4G -Xss16M -jar \${odasa_tools}/extractor-javascript.jar --trap-cache ${trapCache} --exclude **/node_modules --experimental .</build>
    <build>odasa duplicateCode --ram 2048 --minimum-tokens 100</build>
    <build>bash -c "cp ${additionalSources} ${additionalSinks} \${snapshot}/external/data"</build>
  </autoupdate>
</project>`);
		buildAndAnalyse(pkgName, projectDir);
	    }
	}
    }
}

function buildAndAnalyse(pkgName, projectDir) {
    let res = runOdasa(projectDir, "addSnapshot", "--latest");
    if (!res) {
	console.error("Unable to add snapshot for package " + pkgName);
	return;
    }

    res = runOdasa(projectDir, "buildSnapshot", "--latest");
    if (!res) {
	console.error("Unable to build snapshot for package " + pkgName);
	return;
    }

    res = runOdasa(projectDir, "runSnapshotQueries", "--latest", "--suite", suite);
    if (!res) {
	console.error("Unable to run queries for package " + pkgName);
	return;
    }

    runOdasa(projectDir, "unpackFlowSummaries", "--latest", "--suite", suite, "--output-folder", rootDir);
}

function runOdasa(projectDir, cmd, ...args) {
    let shellCmd = `odasa ${cmd} ${args.join(" ")}`;
    console.log("Running " + shellCmd);
    return child_process.spawnSync(shellCmd, { cwd: projectDir, stdio: 'inherit', shell: true }).status === 0;
}

fs.writeFileSync(additionalSources, '');
fs.writeFileSync(additionalSinks, '');
proc(rootDir, true);
