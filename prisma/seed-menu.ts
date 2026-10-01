import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Seeds a demo menu: 5 categories x 6 items. Safe to re-run: existing
 * categories (by name) and items (by name within a category) are skipped,
 * except that existing items without a photo get one attached.
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
  /** Candidate photos; the first one that uploads wins. */
  image?: string | string[];
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
      { name: 'Buffalo Chicken Wings', description: '8 wings tossed in spicy buffalo sauce, blue cheese dip.', price: 8.49, stock: 40, image: [unsplash('1567620832903-9fc6debc209f'), unsplash('1608039755401-742074f0548d'), unsplash('1527477396000-e27163b481c2')] },
      { name: 'Mozzarella Sticks', description: 'Breaded mozzarella with marinara dipping sauce.', price: 6.25, stock: 35, image: [unsplash('1531749668029-2db88e4276c7'), unsplash('1548340748-6d2b7d7da280'), unsplash('1541592106381-b31e9677c0e5')] },
      { name: 'Garden Salad', description: 'Mixed greens, cherry tomatoes, cucumber, vinaigrette.', price: 5.5, stock: 50, image: unsplash('1512621776951-a57141f2eefd') },
      { name: 'Avocado Toast', description: 'Sourdough, smashed avocado, chili flakes, lime.', price: 6.75, stock: 4, image: unsplash('1482049016688-2d3e1b311543') },
      { name: 'Vegetable Spring Rolls', description: 'Four crispy rolls with sweet chili sauce.', price: 5.25, stock: 60, image: [unsplash('1606525437679-037aca74a3e9'), unsplash('1544601640-0f2d0d7e9a6f'), unsplash('1563245372-f21724e3856d')] },
    ],
  },
  {
    name: 'Burgers',
    image: unsplash('1568901346375-23c9450c58cd'),
    items: [
      { name: 'Classic Beef Burger', description: 'Beef patty, lettuce, tomato, pickles, house sauce.', price: 9.99, stock: 80, image: unsplash('1568901346375-23c9450c58cd') },
      { name: 'Double Cheeseburger', description: 'Two beef patties, double cheddar, caramelized onions.', price: 12.49, stock: 45, image: unsplash('1550547660-d9450f859349') },
      { name: 'Crispy Chicken Burger', description: 'Buttermilk fried chicken, slaw, spicy mayo.', price: 10.25, stock: 50, image: unsplash('1571091718767-18b5b1457add') },
      { name: 'BBQ Bacon Burger', description: 'Smoked bacon, onion rings, BBQ glaze, cheddar.', price: 11.75, stock: 3, image: [unsplash('1553979459-d2229ba7433b'), unsplash('1594212699903-ec8a3eca50f5')] },
      { name: 'Mushroom Swiss Burger', description: 'Sautéed mushrooms, Swiss cheese, garlic aioli.', price: 11.25, stock: 30, image: [unsplash('1572802419224-296b0aeee0d9'), unsplash('1586190848861-99aa4a171e90')] },
      { name: 'Veggie Bean Burger', description: 'Black bean patty, avocado, pico de gallo.', price: 9.5, stock: 25, image: [unsplash('1520072959219-c595dc870360'), unsplash('1525059696034-4967a8e1dca2'), unsplash('1596662951482-0c4ba74a6df6')] },
    ],
  },
  {
    name: 'Pizza',
    image: unsplash('1513104890138-7c749659a591'),
    items: [
      { name: 'Margherita Pizza', description: 'San Marzano tomato, fresh mozzarella, basil.', price: 11.99, stock: 40, image: unsplash('1574071318508-1cdbab80d002') },
      { name: 'Pepperoni Pizza', description: 'Loaded pepperoni with mozzarella and oregano.', price: 13.49, stock: 40, image: unsplash('1628840042765-356cda07504e') },
      { name: 'BBQ Chicken Pizza', description: 'Grilled chicken, red onion, BBQ sauce, cilantro.', price: 14.25, stock: 30, image: unsplash('1565299624946-b28f40a0ae38') },
      { name: 'Four Cheese Pizza', description: 'Mozzarella, gorgonzola, parmesan and fontina.', price: 13.99, stock: 25, image: [unsplash('1593560708920-61dd98c46a4e'), unsplash('1590947132387-155cc02f3212')] },
      { name: 'Veggie Supreme Pizza', description: 'Bell peppers, olives, mushrooms, onions, tomato.', price: 12.75, stock: 30, image: unsplash('1513104890138-7c749659a591') },
      { name: 'Hawaiian Pizza', description: 'Ham, pineapple and mozzarella.', price: 12.99, stock: 0, isAvailable: false, image: [unsplash('1604382354936-07c5d9983bd3'), unsplash('1595854341625-f33ee10dbf94')] },
    ],
  },
  {
    name: 'Desserts',
    image: unsplash('1551024601-bec78aea704b'),
    items: [
      { name: 'Chocolate Lava Cake', description: 'Warm molten center with vanilla ice cream.', price: 6.99, stock: 30, image: unsplash('1565958011703-44f9829ba187') },
      { name: 'New York Cheesecake', description: 'Creamy baked cheesecake with berry compote.', price: 6.5, stock: 20, image: [unsplash('1533134242443-d4fd215305ad'), unsplash('1524351199678-941a58a3df50')] },
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
      { name: 'Fresh Orange Juice', description: 'Freshly squeezed, no added sugar.', price: 3.99, stock: 60, image: [unsplash('1600271886742-f049cd451bba'), unsplash('1613478223719-2ab802602423'), unsplash('1621506289937-a8e4df240d0b')] },
      { name: 'Iced Lemon Tea', description: 'Black tea with lemon and mint over ice.', price: 2.99, stock: 80, image: [unsplash('1556679343-c7306c1976bc'), unsplash('1499638673689-79a0b5115d87')] },
      { name: 'Mango Smoothie', description: 'Mango, banana and yogurt blended smooth.', price: 4.75, stock: 45, image: [unsplash('1623065422902-30a2d299bbe4'), unsplash('1505252585461-04db1eb84625'), unsplash('1553530666-ba11a7da3888')] },
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

  async function upload(source: string | string[] | undefined, folder: string, label: string) {
    if (!withImages || !source) return null;
    for (const url of Array.isArray(source) ? source : [source]) {
      try {
        const result = await cloudinary.uploader.upload(url, { folder, format: 'webp' });
        return result.public_id;
      } catch (err) {
        console.warn(`  ! image failed for ${label}: ${(err as { message?: string }).message ?? err}`);
      }
    }
    return null;
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
          include: { _count: { select: { images: true } } },
        });
        if (existing) {
          const imagePublicId =
            existing._count.images === 0
              ? await upload(item.image, MENU_ITEM_FOLDER, item.name)
              : null;
          if (imagePublicId) {
            await prisma.menuImage.create({ data: { imagePublicId, menuItemId: existing.id } });
            images++;
          }
          console.log(`  = ${item.name} (exists${imagePublicId ? ', image added' : ''})`);
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
