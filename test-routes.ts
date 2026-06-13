import 'reflect-metadata';
import express from 'express';
import userInfluencerRoutes from './src/interface/routes/user/userInfluencerRoutes';

const app = express();
app.use('/api/user/influencer', userInfluencerRoutes);

// force router initialization
app.get('/', (req, res) => res.send('ok'));

const routes: string[] = [];
app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
        routes.push(Object.keys(middleware.route.methods)[0].toUpperCase() + ' ' + middleware.route.path);
    } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler: any) => {
            const route = handler.route;
            if (route) {
                routes.push(Object.keys(route.methods)[0].toUpperCase() + ' ' + middleware.regexp + ' ' + route.path);
            }
        });
    }
});
console.log(routes);
