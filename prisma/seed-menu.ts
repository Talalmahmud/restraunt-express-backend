import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Seeds a demo menu: 5 categories x 6 items. Safe to re-run: existing
 * categories (by name) and items (by name within a category) are skipped.
 * Photos are uploaded to Cloudinary from Unsplash when credentials are set;
 * an item is still created if its photo fails. Pass --no-images to skip.
 */

const MENU_ITEM_FOLDER = 'menu-items';
const CATEGORY_FOLDER = 'categories';

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&fm=jpg`;

interface SeedItem {
  name: string;
  description: string;
  price: number;
  stock: number;
  isAvailable?: boolean;
  image?: string;
}

interface SeedCategory {
  name: string;
  image?: string;
  items: SeedItem[];
}

const MENU: SeedCategory[] = [
  {
    name: 'Starters',
    image: unsplash('1540189549336-e6e99c3679fe'),
    items: [
      { name: 'Crispy French Fries', description: 'Golden fries with sea salt and house ketchup.', price: 3.99, stock: 120, image: unsplash('1573080496219-bb080dd4f877') },
      { name: 'Buffalo Chicken Wings', description: '8 wings tossed in spicy buffalo sauce, blue cheese dip.', price: 8.49, stock: 40 },
      { name: 'Mozzarella Sticks', description: 'Breaded mozzarella with marinara dipping sauce.', price: 6.25, stock: 35 },
      { name: 'Garden Salad', description: 'Mixed greens, cherry tomatoes, cucumber, vinaigrette.', price: 5.5, stock: 50, image: unsplash('1512621776951-a57141f2eefd') },
      { name: 'Avocado Toast', description: 'Sourdough, smashed avocado, chili flakes, lime.', price: 6.75, stock: 4, image: unsplash('1482049016688-2d3e1b311543') },
      { name: 'Vegetable Spring Rolls', description: 'Four crispy rolls with sweet chili sauce.', price: 5.25, stock: 60 },
    ],
  },
  {
    name: 'Burgers',
    image: unsplash('1568901346375-23c9450c58cd'),
    items: [
      { name: 'Classic Beef Burger', description: 'Beef patty, lettuce, tomato, pickles, house sauce.', price: 9.99, stock: 80, image: unsplash('1568901346375-23c9450c58cd') },
      { name: 'Double Cheeseburger', description: 'Two beef patties, double cheddar, caramelized onions.', price: 12.49, stock: 45, image: unsplash('1550547660-d9450f859349') },
      { name: 'Crispy Chicken Burger', description: 'Buttermilk fried chicken, slaw, spicy mayo.', price: 10.25, stock: 50, image: unsplash('1571091718767-18b5b1457add') },
      { name: 'BBQ Bacon Burger', description: 'Smoked bacon, onion rings, BBQ glaze, cheddar.', price: 11.75, stock: 3 },
      { name: 'Mushroom Swiss Burger', description: 'Sautéed mushrooms, Swiss cheese, garlic aioli.', price: 11.25, stock: 30 },
      { name: 'Veggie Bean Burger', description: 'Black bean patty, avocado, pico de gallo.', price: 9.5, stock: 25 },
    ],
  },
  {
    name: 'Pizza',
    image: unsplash('1513104890138-7c749659a591'),
    items: [
      { name: 'Margherita Pizza', description: 'San Marzano tomato, fresh mozzarella, basil.', price: 11.99, stock: 40, image: unsplash('1574071318508-1cdbab80d002') },
      { name: 'Pepperoni Pizza', description: 'Loaded pepperoni with mozzarella and oregano.', price: 13.49, stock: 40, image: unsplash('1628840042765-356cda07504e') },
      { name: 'BBQ Chicken Pizza', description: 'Grilled chicken, red onion, BBQ sauce, cilantro.', price: 14.25, stock: 30, image: unsplash('1565299624946-b28f40a0ae38') },
      { name: 'Four Cheese Pizza', description: 'Mozzarella, gorgonzola, parmesan and fontina.', price: 13.99, stock: 25 },
      { name: 'Veggie Supreme Pizza', description: 'Bell peppers, olives, mushrooms, onions, tomato.', price: 12.75, stock: 30, image: unsplash('1513104890138-7c749659a591') },
      { name: 'Hawaiian Pizza', description: 'Ham, pineapple and mozzarella.', price: 12.99, stock: 0, isAvailable: false },
    ],
  },
  {
    name: 'Desserts',
    image: unsplash('1551024601-bec78aea704b'),
    items: [
      { name: 'Chocolate Lava Cake', description: 'Warm molten center with vanilla ice cream.', price: 6.99, stock: 30, image: unsplash('1565958011703-44f9829ba187') },
      { name: 'New York Cheesecake', description: 'Creamy baked cheesecake with berry compote.', price: 6.5, stock: 20 },
      { name: 'Glazed Donuts', description: 'Three fresh donuts with assorted glazes.', price: 4.25, stock: 50, image: unsplash('1551024601-bec78aea704b') },
      { name: 'Ice Cream Sundae', description: 'Three scoops, hot fudge, whipped cream, cherry.', price: 5.75, stock: 40, image: unsplash('1563805042-7684c019e1cb') },
      { name: 'Berry Yogurt Parfait', description: 'Greek yogurt, granola and fresh berries.', price: 4.99, stock: 5, image: unsplash('1488477181946-6428a0291777') },
      { name: 'Fluffy Pancakes', description: 'Stack of three with maple syrup and butter.', price: 5.99, stock: 35, image: unsplash('1567620905732-2d1ec7ab7445') },
    ],
  },
  {
    name: 'Drinks',
    image: unsplash('1544145945-f90425340c7e'),
    items: [
      { name: 'Espresso', description: 'Double shot of our house blend.', price: 2.5, stock: 200, image: unsplash('1509042239860-f550ce710b93') },
      { name: 'Cappuccino', description: 'Espresso, steamed milk and thick foam.', price: 3.75, stock: 200, image: unsplash('1495474472287-4d71bcdd2085') },
      { name: 'Fresh Orange Juice', description: 'Freshly squeezed, no added sugar.', price: 3.99, stock: 60 },
      { name: 'Iced Lemon Tea', description: 'Black tea with lemon and mint over ice.', price: 2.99, stock: 80 },
      { name: 'Mango Smoothie', description: 'Mango, banana and yogurt blended smooth.', price: 4.75, stock: 45 },
      { name: 'Signature Mocktail', description: 'Passion fruit, lime, soda and mint.', price: 5.25, stock: 40, image: unsplash('1544145945-f90425340c7e') },
    ],
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  const withImages =
    !process.argv.includes('--no-images') &&
    Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
  if (withImages) {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
    });
  } else {
    console.log('Skipping images (Cloudinary not configured or --no-images).');
  }

  async function upload(url: string | undefined, folder: string, label: string) {
    if (!withImages || !url) return null;
    try {
      const result = await cloudinary.uploader.upload(url, { folder, format: 'webp' });
      return result.public_id;
    } catch (err) {
      console.warn(`  ! image failed for ${label}: ${(err as { message?: string }).message ?? err}`);
      return null;
    }
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  let createdCategories = 0;
  let createdItems = 0;
  let images = 0;

  try {
    for (const seed of MENU) {
      let category = await prisma.category.findUnique({ where: { name: seed.name } });
      if (!category) {
        const imagePublicId = await upload(seed.image, CATEGORY_FOLDER, seed.name);
        if (imagePublicId) images++;
        category = await prisma.category.create({ data: { name: seed.name, imagePublicId } });
        createdCategories++;
      }
      console.log(`${category.name}`);

      for (const item of seed.items) {
        const existing = await prisma.menuItem.findFirst({
          where: { name: item.name, categoryId: category.id },
        });
        if (existing) {
          console.log(`  = ${item.name} (exists)`);
          continue;
        }

        const imagePublicId = await upload(item.image, MENU_ITEM_FOLDER, item.name);
        if (imagePublicId) images++;
        await prisma.menuItem.create({
          data: {
            name: item.name,
            description: item.description,
            price: item.price,
            stock: item.stock,
            isAvailable: item.isAvailable ?? true,
            categoryId: category.id,
            images: imagePublicId ? { create: [{ imagePublicId }] } : undefined,
          },
        });
        createdItems++;
        console.log(`  + ${item.name}${imagePublicId ? ' [image]' : ''}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(
    `\nDone: ${createdCategories} categories, ${createdItems} menu items, ${images} images created.`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
