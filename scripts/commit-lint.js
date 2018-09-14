#!/usr/bin/env node

console.log('🐟🐟🐟 Validating git commit message 🐟🐟🐟');
const gitMessage = require('child_process')
  .execSync('git log -1 --no-merges')
  .toString()
  .trim();
const matchCommit = /([a-z]){0,8}\([a-z.0-9\-]+\):\s(([a-z0-9:\-\s])+)/g.test(
  gitMessage
);
const matchRelease = /release/gi.test(gitMessage);
const exitCode = +!(matchRelease || matchCommit);

if (exitCode === 0) {
  console.log('Commit ACCEPTED 👌');
} else {
  console.log(
    '[Error]: Ho no! 😦 Your commit message: \n' +
      '-------------------------------------------------------------------\n' +
      gitMessage +
      '\n-------------------------------------------------------------------' +
      '\n\n 👉️ Does not follow the commit message convention specified in the CONTRIBUTING.MD file.'
  );
  console.log('\ntype(scope): subject \n BLANK LINE \n body');
  console.log(
    '\nEXAMPLE: \n ' +
      'feat(schematics): add an option to generate lazy-loadable modules\n' +
      '\n`ng generate lib mylib --lazy` provisions the mylib project in tslint.json'
  );
}
process.exit(exitCode);
