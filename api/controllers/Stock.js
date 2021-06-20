const axios = require("axios");
const response = require("express");
const fs = require('fs');
var path = require('path');
const { exit } = require("process");

const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

require('dotenv').config()

const aux = require("../helpers/aux");

module.exports = app => {
    const controller = {};

    /**
     * Requisição que realiza a coleta dos dados de um produto,
     * a partir do seu código de barras.
     * 
     * @param {*} req 
     * @param {*} res 
     */
    controller.stock = async (req, res) => {
        try {
            // Verifica se é necessária uma nova token.
            let token = await aux.verifyToken();
            // Realiza uma requisição para a atualização de todas os produtos.
            let responseStock = await controller.runStock(token);
            if (responseStock == undefined || responseStock == false) {
                res.status(404).json("Problema na API do HIPER. Tente Novamente.")
                return;
            }
            // Realiza a coleta dos produtos presente no WooCommerce.
            let listProducts = await controller.getStockWooCommerce();
            let variationInformation;
            for (i = 0; i < responseStock.produtos.length; i++) {
                if (listProducts[responseStock.produtos[i].codigoDeBarras] != undefined) {
                    // Condição onde o produto não possui nenhuma variação.
                    if (listProducts[responseStock.produtos[i].codigoDeBarras]['variation'] == undefined) {
                        await controller.runStockWooCommerce(
                            listProducts[responseStock.produtos[i].codigoDeBarras],
                            responseStock.produtos[i].preco
                        );
                    } else {
                        // Primeiro atualizamos primeiro o produto "pai".
                        await controller.runStockWooCommerce(
                            listProducts[responseStock.produtos[i].codigoDeBarras].id,
                            responseStock.produtos[i].preco
                        );
                        // Agora iremos coletar os códigos de barras dos produtos secundários.
                        await controller.existVariation(
                            listProducts[responseStock.produtos[i].codigoDeBarras].variation,
                            listProducts[responseStock.produtos[i].codigoDeBarras].id,
                            responseStock.produtos
                        );
                    }
                }
            }
            res.status(200).json("A atualização finalizou.")
            return;
        } catch (error) {
            console.log(error);
            res.status(500).json(error)
        }
    };

    /**
     * 
     * @param {array} product 
     * @returns 
     */
    controller.existVariation = async (arrayProduct, idPrincipal = null, listHiper) => {
        if (arrayProduct != undefined &&
            arrayProduct != null && idPrincipal != null) {
            for (j = 0; j < arrayProduct.length; j++) {
                let produtoVariacao = await controller.getStockWooCommerce(
                    idPrincipal,
                    arrayProduct[j]
                );
                if (produtoVariacao != undefined &&
                    produtoVariacao.sku != undefined &&
                    produtoVariacao.sku != '') {
                    for (l = 0; l < listHiper.length; l++) {
                        if (listHiper[l].codigoDeBarras == produtoVariacao.sku) {
                            // Finalmente atualizamos no WooCommerce o produto.
                            await controller.runStockWooCommerce(
                                idPrincipal,
                                listHiper[l].preco,
                                arrayProduct[j]
                            );
                        }
                    }
                }
            }
        }
    }

    /**
     * Requisição que realiza a atualização dos dados dos produtos.
     * 
     * @param {string} token 
     * return @json
     */
    controller.runStock = async (token) => {
        var filename = path.join(__dirname, '../data/products.json');
        // Realiza requisição do estoque.
        var axios = require('axios');
        var config = {
            method: 'get',
            url: 'http://ms-ecommerce.hiper.com.br/api/v1/produtos/pontoDeSincronizacao',
            headers: {
                'Authorization': `Bearer ${token.data.token}`
            },
            timeout: 120000
        };
        let response = await axios(config)
            .then(function (response) {
                return response.data;
            })
            .catch(function (error) {
                console.log(error);
                return false;
            });
        let writeFile = {
            "data": response
        }
        let data = JSON.stringify(writeFile, null, 2);
        fs.writeFileSync(filename, data, (err) => {
            if (err) throw err;
        });
        return response;
    };

    /**
     * Requisição que realiza a atualização dos dados dos produtos
     * no WooCommerce.
     * 
     * @param {string} token 
     * return @json
     */
    controller.getStockWooCommerce = async (mainProduct = null, sideProduct = null) => {
        let flagStop = false;
        let page = 1;
        let config;
        let arrayProducts = {};
        try {
            if (mainProduct == null && sideProduct == null) {
                while (flagStop == false) {
                    config = {
                        method: 'get',
                        url: `https://lojabemmineiro.com.br/wp-json/wc/v3/products?per_page=100&page=${page}`,
                        headers: {
                            'Authorization': 'Basic Y2tfN2QwNGM1MDNkNjQ0M2VjNjI1N2ZkMTU3NGJjYTIzMWE3YTJmZWJhOTpjc19lNDY4NDUzNTllZmQwYmZmN2IyYTE2NzRlYTFkNTBhYjg4NGU2ODJm',
                            'Content-Type': 'application/json',
                        },
                        data: ''
                    };
                    getStockWoo = await axios(config)
                        .then(function (response) {
                            if (response.data[0] == undefined) {
                                flagStop = true;
                            } else {
                                for (i = 0; i < response.data.length; i++) {
                                    if (response.data[i].variations[0] != undefined) {
                                        arrayProducts[response.data[i].sku] = {}
                                        arrayProducts[response.data[i].sku]['variation'] = {}
                                        arrayProducts[response.data[i].sku]['id'] = {}
                                        arrayProducts[response.data[i].sku]['variation'] =
                                            response.data[i].variations
                                        arrayProducts[response.data[i].sku]['id'] =
                                            response.data[i].id
                                    } else {
                                        arrayProducts[response.data[i].sku] =
                                            response.data[i].id
                                    }
                                }
                            }
                        })
                        .catch(function (error) {
                            flagStop = true;
                            console.log(error);
                            return false;
                        });
                    page++;
                }
            } else {
                config = {
                    method: 'get',
                    url: `https://lojabemmineiro.com.br/wp-json/wc/v3/products/${mainProduct}/variations/${sideProduct}`,
                    headers: {
                        'Authorization': 'Basic Y2tfN2QwNGM1MDNkNjQ0M2VjNjI1N2ZkMTU3NGJjYTIzMWE3YTJmZWJhOTpjc19lNDY4NDUzNTllZmQwYmZmN2IyYTE2NzRlYTFkNTBhYjg4NGU2ODJm',
                        'Content-Type': 'application/json'
                    },
                    data: ''
                };

                arrayProducts = await axios(config)
                    .then(function (response) {
                        return response.data;
                    })
                    .catch(function (error) {
                        return false;
                    });
            }
        } catch (error) {
            console.log(error);
            return false;
        }
        return arrayProducts;
    }

    /**
     * Requisição que realiza a atualização dos dados dos produtos
     * no WooCommerce.
     * 
     * @param {string} token 
     * return @json
     */
    controller.runStockWooCommerce = async (productId, price, variationProduct = null) => {
        var data = JSON.stringify({ "price": price });
        if (variationProduct == null) {
            var config = {
                method: 'put',
                url: `https://lojabemmineiro.com.br/wp-json/wc/v3/products/${productId}`,
                headers: {
                    'Authorization': 'Basic Y2tfN2QwNGM1MDNkNjQ0M2VjNjI1N2ZkMTU3NGJjYTIzMWE3YTJmZWJhOTpjc19lNDY4NDUzNTllZmQwYmZmN2IyYTE2NzRlYTFkNTBhYjg4NGU2ODJm',
                    'Content-Type': 'application/json',
                },
                data: data
            };
        } else {
            var config = {
                method: 'put',
                url: `https://lojabemmineiro.com.br/wp-json/wc/v3/products/${productId}/variations/${variationProduct}`,
                headers: {
                    'Authorization': 'Basic Y2tfN2QwNGM1MDNkNjQ0M2VjNjI1N2ZkMTU3NGJjYTIzMWE3YTJmZWJhOTpjc19lNDY4NDUzNTllZmQwYmZmN2IyYTE2NzRlYTFkNTBhYjg4NGU2ODJm',
                    'Content-Type': 'application/json',
                },
                data: data
            };
        }
        updateResponse = await axios(config)
            .then(function (response) {
                console.log(JSON.stringify(response.data));
                // console.log("Atualizado com Sucesso")
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    return controller;
}