import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { Polar } from "@polar-sh/sdk";
import { polar, checkout, portal, usage, webhooks } from "@polar-sh/better-auth";
import { db } from "~/server/db";
import { env } from "~/env";

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: "sandbox",
});

export const auth = betterAuth({
  trustedOrigins: [
    "https://stock-note-ten.vercel.app"
  ],
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
        polar({
            client: polarClient,
            createCustomerOnSignUp: true,
            use: [
                checkout({
                    products: [
                        {
                            productId: "82b305c8-0a4f-4f29-bf3a-af72ffe8fcb0", 
                            slug: "starter" 
                        },
                        {
                            productId: "616f0965-ca1e-4d34-b824-13f4ff5989e1", 
                            slug: "pro" 
                        },
                        {
                            productId: "d126e0c2-c180-49e4-8144-6e59462158d4", 
                            slug: "power" 
                        }
                    ],
                    successUrl: "/",
                    authenticatedUsersOnly: true
                }),
                portal(),
                webhooks({
                    secret: env.POLAR_WEBHOOK_SECRET,
                    onOrderPaid: async (order) => {
                        const externalCustomerId = order.data.customer.externalId;

                        if(!externalCustomerId) {
                            console.error("No external customer ID found");
                            throw new Error("No external customer ID found");
                        }

                        const productId = order.data.product.id;

                        let creditsToAdd = 0;

                        switch(productId) {
                            case "82b305c8-0a4f-4f29-bf3a-af72ffe8fcb0":
                                creditsToAdd = 40;
                                break;
                            case "616f0965-ca1e-4d34-b824-13f4ff5989e1":
                                creditsToAdd = 120;
                                break;
                            case "d126e0c2-c180-49e4-8144-6e59462158d4":
                                creditsToAdd = 400;
                                break;
                        }

                        await db.user.update({
                            where: {
                                id: externalCustomerId
                            },
                            data: {
                                credits: {
                                    increment: creditsToAdd
                                }
                            }
                        });
                    }
                })
            ],
        })
    ]
});
