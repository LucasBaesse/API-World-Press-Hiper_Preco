const axios = require("axios");
const response = require("express");

const aux = require("../helpers/aux");

module.exports = app => {
    const controller = {};

    controller.sale = async (req, res) => {
        const saleController = app.controllers.Stock;
        if (req !== undefined &&
            req.body !== undefined &&
            req.body.codeBar != undefined &&
            req.body.codeBar !== "" &&
            req.body.quantity != undefined &&
            req.body.quantity !== "") {
            // Verifica se é necessária uma nova token.
            let token = await aux.verifyToken();
            // Realiza uma requisição para atualizar os produtos.
            let products = await saleController.runStock(token);
            if (products == false) {
                res.status(500).json("Sorry. Something went happens.");
            } else {
                let indexProduct = products.produtos.findIndex(product => product["codigoDeBarras"] == req.body.codeBar)
                if (indexProduct == -1) {
                    res.status(404).json("The product was not found.")
                } else {
                    let product = products.produtos[indexProduct];
                    res.status(200).json(`${product}.`)
                }
            }
        } else {
            res.status(400).json("Are missing some variables in your request.");
        }
    }

    return controller;
}