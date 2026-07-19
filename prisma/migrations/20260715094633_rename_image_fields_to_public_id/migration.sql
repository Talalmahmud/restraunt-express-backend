/*
  Warnings:

  - You are about to drop the column `image` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `MenuImage` table. All the data in the column will be lost.
  - Added the required column `imagePublicId` to the `MenuImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Category" DROP COLUMN "image",
ADD COLUMN     "imagePublicId" TEXT;

-- AlterTable
ALTER TABLE "MenuImage" DROP COLUMN "imageUrl",
ADD COLUMN     "imagePublicId" TEXT NOT NULL;
