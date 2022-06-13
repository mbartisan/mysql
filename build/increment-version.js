const fs = require('fs');
console.log('Incrementing build number...');
fs.readFile('package.json',function(err,content) {
    if (err) throw err;
    const packageFile = JSON.parse(content.toString());
    const [major, minor, revision] = packageFile.version.split(".")
    const newRevision = parseInt(revision) + 1
    packageFile.version = `${major}.${minor}.${newRevision}`
    fs.writeFile('package.json',JSON.stringify(packageFile, null, 2),function(err){
        if (err) throw err;
        console.log(`Build number: ${major}.${minor}.${newRevision}`);
    })
});