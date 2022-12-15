const router = require('express').Router();
const { Product, Category, Tag, ProductTag } = require('../../models');

// The `/api/products` endpoint

// get all products
router.get('/', async(req, res) => {
  // find all products, response includes its associated Category and Tag data
  try {
    const productData = await Product.findAll({
      // Category and Tag data added as a second model to JOIN with
      include: [{ model: Category }, { model: Tag }],
    });
    res.status(200).json(productData);
  } catch (err) {
    res.status(400).json(err);
  }
});

// get one product
router.get('/:id', async(req, res) => {
  // find a single product by its `id`, response includes its associated Category and Tag data
  try {
    const productData = await Product.findByPk(req.params.id, {
      // Category and Tag data added as a second model to JOIN with
      include: [{ model: Category }, { model: Tag }],
    });

    if (!productData) {
      res.status(404).json({ message: 'No product found with that id!' });
      return;
    }

    res.status(200).json(productData);
  } catch (err) {
    res.status(400).json(err);
  }
});

// create new product
router.post('/', (req, res) => {
  /* req.body should look like this...
    {
      product_name: "Basketball",
      price: 200.00,
      stock: 3,
      tagIds: [1, 2, 3, 4]
    }
  */
  Product.create(req.body)
    .then((product) => {
      // if there's product tags, we need to create pairings to bulk create in the ProductTag model
      if (req.body.tagIds.length) {
        const productTagIdArr = req.body.tagIds.map((tag_id) => {
          return {
            product_id: product.id,
            tag_id,
          };
        });
        return ProductTag.bulkCreate(productTagIdArr);
      }
      // if no product tags, just respond
      res.status(200).json(product);
    })
    .then((productTagIds) => res.status(200).json(productTagIds))
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

// update product

router.put('/:id', async(req, res) => {
  try{
    await Product.update(req.body, {
      where: {
        id: req.params.id,
      }
    })
    let payload = req.body;
    if(!req.body.id){
      payload.id = req.params.id;
    } else if (payload.id !== req.params.id){
      req.status(400).json("inconsistent product id in request");
    }
    if (req.params.tagIds) {    
      const productTagData = await ProductTag.findAll({
        where: {
          id: req.params.id,
        }
        
      })
      let productTagIds = productTagData.map(({tag_id}) => tag_id);
      let newProductTags = req.body.tagIds
          .filter((tag_id) => !productTagIds.includes(tag_id))
          .map((tag_id) => {
            return {
              product_id: req.params.id,
              tag_id,
            };
          });
          const productTagsToRemove = productTagData
          .filter(({ tag_id }) => !req.body.tagIds.includes(tag_id))
          .map(({ id }) => id);
      const removed = await ProductTag.destroy({ where: { id: productTagsToRemove } });
      const bulkCreate = await ProductTag.bulkCreate(newProductTags);
      if (removed && bulkCreate){
        next();
      } else {
        res.status(500).json(`Error occur during update ProductTag, removed status: ${removed}, bulkCreate status: ${bulkCreate}`);
      }
    }
    res.status(200).json(payload);
  } catch(err) {
    res.status(400).json(err);
  }
})

router.delete('/:id', async(req, res) => {
  // delete one product by its `id` value
  try {
    const productData = await Product.destroy({
      where: { id: req.params.id }
    });
    if (!productData) {
      res.status(404).json({ message: 'No product with this id!' });
      return;
    }
    res.status(200).json(`Product id ${req.params.id} deleted`);
  } catch (error) {
    res.status(400).json(error);
  }
});

module.exports = router;
