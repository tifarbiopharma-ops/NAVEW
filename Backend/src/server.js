import express from "express";
import cors from "cors";
import http from 'http';
import userRoutes from './routers/User_routes.js';
import salidasRoutes from './routers/Salidas_routes.js';

const app = express();

const corsOptions = {
  origin: [process.env.FRONTEND_URL].filter(Boolean),
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('port', process.env.PORT || 3000);

app.get('/', (req, res) => {
  res.send('Servidor funcionando correctamente - Backend FARBIO');
});

app.use('/api/users', userRoutes);
app.use('/api/salidas', salidasRoutes);

const server = http.createServer(app);

app.use((req, res) => res.status(404).send('Endpoint no encontrado - 404'));

export { app, server };

