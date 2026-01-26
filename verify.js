import fs from "fs/promises";
import path from "path";

const dirPath = "./data"; 

const processFile = async (filePath, fileName) => {
  const content = await fs.readFile(filePath, "utf-8");
  console.log(`fileName: ${fileName}`);
  // console.log(content);
};

const run = async () => {
  const files = await fs.readdir(dirPath);

  for (const fileName of files) {
    const filePath = path.join(dirPath, fileName);

    const stat = await fs.stat(filePath);
    if (!stat.isFile()) continue; 

    await processFile(filePath, fileName);
  }
};

run().catch(console.error);

