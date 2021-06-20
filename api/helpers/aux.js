const fs = require('fs');
var path = require('path');

const auth = require("../controllers/Auth");

module.exports = {
    verifyToken: async() => {
        var filename = path.join(__dirname, '../data/token.json');
        let tokenJson = fs.readFileSync(filename);
        tokenJson = JSON.parse(tokenJson);
        let date = new Date();
        // Conferir se a token não é válida, caso isso seja verdadeiro,
        // iremos realizar uma requisição de autenticação.
        if (tokenJson.data.token == "" ||
            tokenJson.data.expireDate == "" ||
            tokenJson.data.expireDate < date.getTime()) {
            let test = await auth.runAuth();
            let newtokenJson = fs.readFileSync(filename);
            newtokenJson = JSON.parse(newtokenJson);
            return newtokenJson;
        }
        return tokenJson;
    }
}