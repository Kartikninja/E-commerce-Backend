import { UserModel } from '@/models/users.model';
import { UserSubscriptionModel } from '@/models/UserSubscriptionSchema.model';
import { UserService } from '@/services/user.service';
import { UserSubscriptionService } from '@/services/UserSubscription.service';
import cron from 'node-cron';
import Container from 'typedi';

export const cron1 = cron.schedule('0 0 * * *', async () => {
    const expirySub = Container.get(UserSubscriptionService)
    const user = Container.get(UserService)
    try {
        await expirySub.checkSubscriptionExpiry();

        await user.checkSubsciption()
    } catch (error) {
        console.error("Error during cron job:", error);
    }
});

