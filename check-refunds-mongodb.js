// 🔍 SCRIPT DE DIAGNÓSTICO MONGODB
// Ejecutar en MongoDB Compass o mongosh

// 1. Ver todas las ventas del usuario
db.sales.find({ user: ObjectId("TU_USER_ID_AQUI") }).pretty()

// 2. Ver todos los reembolsos
db.refunds.find({ 
    sale: { $in: [
        ObjectId("692339b44401d5ed76ad8923"),
        ObjectId("692339814401d5ed76ad885d"),
        ObjectId("TU_TERCERA_VENTA_ID")
    ]}
}).pretty()

// 3. Contar reembolsos por estado
db.refunds.aggregate([
    {
        $match: {
            state: 1,
            sale: { $in: [
                ObjectId("692339b44401d5ed76ad8923"),
                ObjectId("692339814401d5ed76ad885d")
            ]}
        }
    },
    {
        $group: {
            _id: "$status",
            count: { $sum: 1 },
            sales: { $push: "$sale" }
        }
    }
])

// 4. Ver detalles completos de cada reembolso
db.refunds.find({
    sale: { $in: [
        ObjectId("692339b44401d5ed76ad8923"),
        ObjectId("692339814401d5ed76ad885d")
    ]},
    state: 1
}, {
    sale: 1,
    status: 1,
    sale_detail_item: 1,
    createdAt: 1,
    completedAt: 1
}).pretty()
