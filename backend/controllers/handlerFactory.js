const APIFeatures = require("../utils/apiFeatures");
exports.deleteOne = (Model) => {
  return async (req, res, next) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);

      res.status(200).json({
        data: null,
        message: "Deleted Sucesfully ",
      });
    } catch (e) {
      console.log(e);
      res.status(404).json({
        status: "error",
        message: e,
      });
    }
  };
};

exports.updateOne = (Model) => {
  return async (req, res, next) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!doc) {
        return res.status(404).send("No Document with that ID");
      }
      res.status(200).json({
        status: "success",
        data: {
          data: doc,
        },
      });
    } catch (e) {
      res.status(404).json({
        status: "error",
        message: e,
      });
    }
  };
};

exports.createOne = (Model) => {
  return async (req, res, next) => {
    try {
      const doc = await Model.create(req.body);
      if (!doc) {
        return res.status(404).send("No Document with that ID");
      }
      res.status(200).json({
        status: "success",
        data: {
          data: doc,
        },
      });
    } catch (e) {
      res.status(404).json({
        status: "error",
        message: e,
      });
    }
  };
};
exports.getOne = (Model, popOptions) => {
  return async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query.select("-__v");
    if (!doc) {
      return res.status(404).send("No Document with that ID");
    }
    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  };
};

exports.getAll = (Model) => {
  return async (req, res, next) => {
    const filter = {};
    if (req.params.tourId) filter = { filer: req.params.tourId };
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .limitFields()
      .sort()
      .paginate();
    const doc = await features.query;
    res.status(200).json({
      status: "success",
      data: {
        result: doc.length,
        data: doc,
      },
    });
  };
};
