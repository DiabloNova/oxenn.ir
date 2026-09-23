const { ESLint } = require("eslint");

(async function main() {
  const eslint = new ESLint();
  const results = await eslint.lintFiles(["."]);

  let syntaxErrors = [];
  results.forEach(r => {
    r.messages.forEach(m => {
      if (m.fatal ||
          m.message.toLowerCase().includes("parse") ||
          m.message.toLowerCase().includes("syntax")
         ) {
         syntaxErrors.push({ file: r.filePath, line: m.line, msg: m.message, ruleId: m.ruleId });
      }
    });
  });
  console.log(JSON.stringify(syntaxErrors, null, 2));
})().catch(console.error);
