import {DefaultArtifactClient} from '@actions/artifact'

const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');
const https = require('https');
const artifact = require('@actions/artifact');
const AdmZip = require('adm-zip'); // Add at the top

function downloadFile(url, dest, maxRedirects = 5) {
  core.debug(`Downloading: ${url} -> ${dest} (redirects left: ${maxRedirects})`);
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      core.debug(`HTTP status: ${response.statusCode}`);
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location && maxRedirects > 0) {
        core.debug(`Redirecting to: ${response.headers.location}`);
        file.close();
        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest);
        }
        return downloadFile(response.headers.location, dest, maxRedirects - 1).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        core.debug(`Download finished: ${dest}`);
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  try {
    const version = core.getInput('gitleaks-version') || '8.27.2';
    core.debug(`Using Gitleaks version: ${version}`);
    const url = `https://github.com/gitleaks/gitleaks/releases/download/v${version}/gitleaks_${version}_windows_x64.zip`;
    const binDir = path.join(process.cwd(), 'gitleaks-bin');
    const zipPath = path.join(binDir, 'gitleaks.zip');
    const gitleaksPath = path.join(binDir, 'gitleaks.exe');

    core.debug(`binDir: ${binDir}`);
    if (!fs.existsSync(binDir)) {
      core.debug('Creating binDir');
      fs.mkdirSync(binDir);
    }

    core.debug(`Downloading Gitleaks from ${url}`);
    await downloadFile(url, zipPath);

    core.debug(`Extracting zip: ${zipPath}`);
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(binDir, true);

    core.debug(`Setting permissions for: ${gitleaksPath}`);
    fs.chmodSync(gitleaksPath, 0o755);

    const reportPath = path.join(process.cwd(), 'gitleaks-report.json');
    core.debug(`Running Gitleaks scan, output: ${reportPath}`);
    let gitleaksExitCode = 0;
    gitleaksExitCode = await exec.exec(
      `${gitleaksPath} detect --report-format json --report-path "${reportPath}" --verbose`,
      [],
      {
        ignoreReturnCode: true,
        listeners: {
          stdline: (data) => core.info(data),
          errline: (data) => core.error(data),
        }
      }
    );

    if (fs.existsSync(reportPath)) {
      core.debug('Uploading Gitleaks report as artifact');
      const artifactClient = new DefaultArtifactClient();
      await artifactClient.uploadArtifact('gitleaks-report', [reportPath], process.cwd());
      core.info('Gitleaks report uploaded.');
    } else {
      core.warning('Gitleaks report not found.');
    }

    // Handle Gitleaks exit code at the end
    if (gitleaksExitCode !== 0) {
      core.setFailed(`Gitleaks detected leaks or failed with exit code ${gitleaksExitCode}. See the report for details.`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
