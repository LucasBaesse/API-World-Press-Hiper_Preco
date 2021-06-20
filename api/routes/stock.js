module.exports = app => {
    const controller = app.controllers.Stock;

    app.route('/api/v1/stock')
        .get(controller.stock)
}