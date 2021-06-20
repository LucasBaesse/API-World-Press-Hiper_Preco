const axios = require("axios");
const response = require("express");
const fs = require('fs');
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
var path = require('path');

require('dotenv').config();

const tokenJson = require("../data/token.json");

module.exports = {
    /**
     * Método responsável por realizar a requisição de geração de token.
     * 
     * return @json 
     */
    runAuth: async () => {
        var filename = path.join(__dirname, '../data/token.json');
        // Realiza a geração de uma nova Token.
        var config = {
            method: 'get',
            url: `http://ms-ecommerce.hiper.com.br/api/v1/auth/gerar-token/${process.env.SECURITY_CODE}`,
            headers: {}
        };
        // Resposta da Requisição de Autenticação.
        let response = await axios(config)
            .then(function (response) {
                return response.data;
            })
            .catch(function (error) {
                console.log("Erro Autenticação: ", error);
                return false;
            });

        if (response !== false) {
            let date = new Date();
            let writeFile = {
                "data": {
                    "token": response.token,
                    "expireDate": date.setHours(date.getHours() + 6).toString()
                }
            }
            let data = JSON.stringify(writeFile, null, 2);
            fs.writeFileSync(filename, data, (err) => {
                if (err) throw err;
            });
            return true;
        }
        return response;
    }
}