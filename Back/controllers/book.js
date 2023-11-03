const Book = require('../models/Book');
const fs = require('fs');

exports.getBooks = (req, res, next) => {
    Book.find()
    .then(books => res.status(200).json(books))
    .catch(error => res.status(400).json({ error }));
}

exports.getBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id})
    .then(book => res.status(200).json(book))
    .catch(error => res.status(404).json( { error }));
}

exports.addBook = (req, res, next) => {
    const bookObject = JSON.parse(req.body.book);
    delete bookObject._id;
    delete bookObject._userId;
    const book = new Book({
        ...bookObject,
        userId: req.auth.userId,
        imageUrl: req.file ? `${req.protocol}://${req.get('host')}/${req.file.name}` : null
    });
    book.save()
    .then(() => res.status(201).json({ message: 'Livre enregistré.' }))
    .catch(error => res.status(400).json({ error }));
}

exports.updateBook = (req, res, next) => {
    const bookObject = req.file ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get('host')}/${req.file.name}`
    } : { ...req.body };

    delete bookObject._id;

    Book.findOne( { _id: req.params.id })
    .then((book) => {
        if (book.userId != req.auth.userId) {
            res.status(403).json( {message: 'Vous n\'êtes pas autorisé à modifier ce livre.' });
        } else {
            const oldImage = book.imageUrl;
            Book.updateOne( { _id: req.params.id }, { ...bookObject, _id: req.params.id })
            .then(() => {
                if (req.file && oldImage) {
                    const filename = oldImage.split('/images/')[1];
                    fs.unlink(`images/${filename}`, (error) => {
                        if (error) {
                            return res.status(400).json({ message: "Une erreur est survenue lors de la suppression de l'ancienne image : ", error });
                        }
                    });
                }
                res.status(200).json({ message: 'Livre modifié.' });
            })
            .catch(error => res.status(400).json( {error} ));
        }
    })
    .catch(error => res.status(400).json({ error }));
}

exports.deleteBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id})
    .then(book => {
        if (book.userId != req.auth.userId) {
            res.status(401).json( {message: 'Vous n\'êtes pas autorisé à supprimer ce livre.' });
        } else {
            const filename = book.imageUrl.split('/images/')[1];
            fs.unlink(`images/${filename}`, () => {
                Book.deleteOne( { _id: req.params.id })
                .then(() => res.status(200).json( { message: 'Livre supprimé.'}))
                .catch(error => res.status(401).json( { error }));
            });
        }
    })
    .catch(error => { res.status(500).json({ error })} );
}

exports.getBestRating = (req, res, next) => {
    Book.find()
    // Tri dans l'ordre décroissant
    .sort({averageRating: -1})
    .limit(3)
    .then(books => res.status(200).json(books))
    .catch(error => res.status(400).json({ error }));
}

exports.addRating = (req, res, next) => {
    const id = req.params.id;
    Book.findOne({ _id: id, "ratings.userId": req.auth.userId})
    .then(book => {
        if (book) {
            return res.status(400).json({ message: 'Vous avez déjà noté ce livre.'})
        }

        Book.findByIdAndUpdate(id, {
            $push: {
                ratings: {
                    userId: req.auth.userId,
                    grade: req.body.rating
                }
            }
        }, { new: true })
        .then(book => {
            if(!book) {
                return res.status(400).json({ message: "Ce livre n'existe pas."})
            }
            const totalRatings = book.ratings.length;
            let sumOfRates = 0;
            
            book.ratings.map(rating => sumOfRates += rating.grade);
            
            book.averageRating = sumOfRates / totalRatings;
            
            book.save()
            .then(() => res.status(200).json(book))
            .catch(error => res.status(400).json({ error }));
        })
        .catch(error => res.status(400).json({ error }));
    })
    .catch(error => res.status(400).json({ error }));
}