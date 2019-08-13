const { admin } = require('../utils/admin'); 

exports.getAllScreams = (req, res) => {
    admin
        .firestore()
        .collection('screams')
        .orderBy('createdAt', 'desc')
        .get()
        .then(data => {
            let screams = [];
            data.forEach(doc => {
                screams.push({
                    screamId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt
                });
            });
            return res.json(screams);
        })
        .catch(err => console.error(err));
}


exports.postOneScream = (req, res) => {
    if(req.body.body.trim() === ''){
        return res.status(400).json({ body: 'Body must not be empty' });
    }
    const newScream = {
        body: req.body.body,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    };

    admin.firestore()
        .collection('screams')
        .add(newScream)
        .then((doc) => {
            const resScream = newScream;
            resScream.screamId = doc.id;
            res.json(resScream);
        })
        .catch(err => {
            res.status(500).json({ error: 'something went wrong' });
            console.error(err);
        });
}

exports.getScream = (req, res) => {
    let screamData = {};
    admin.firestore().doc(`/screams/${req.params.screamId}`).get()
        .then(doc => {
            if(!doc.exists){
                return res.status(400).json({ error: 'Scream not found' });
            }
            screamData = doc.data();
            screamData.screamId = doc.id;
            return admin
                .firestore()
                .collection('comments')
                .orderBy('createdAt', 'desc')
                .where('screamId', '==', req.params.screamId)
                .get();
        })
        .then(data => {
            screamData.comments = [];
            data.forEach(doc => {
                screamData.comments.push(doc.data());
            });
            return res.json(screamData);
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err });
        });
};

exports.commentOnScream = (req, res) => {
    if(req.body.body.trim() === '') return res.status(400).json({ error: 'Must not be empty' });

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        screamId: req.params.screamId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    };
    
    admin.firestore().doc(`/screams/${req.params.screamId}`).get()
        .then(doc => {
            if(!doc.exists) {
                return res.status(400).json({ error: 'Scream not found' });
            }
            return admin.firestore().collection('comments').add(newComment);
        })
        .then(() => {
            res.json(newComment);
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'Something went wrong' });
        });
};

    
exports.likeScream = (req, res) => {
    const likeDocument = admin.firestore()
            .collection('likes')
            .where('userHandle', '==', req.user.handle)
            .where('screamId', '==', req.params.screamId)
            .limit(1);
    
    const screamDocument = admin.firestore().doc(`/screams/${req.params.screamId}`);

    let screamData;

    screamDocument.get()
        .then(doc => {
            if(doc.exists){
                screamData = doc.data();
                screamData.screamId = doc.id;
                return likeDocument.get();
            } else {
                return res.status(404).json({ error: 'Scream not found' });
            }
        })
        .then(data => {
            if(data.empty){
                return admin.firestore().collection('likes').add({
                    screamId: req.params.screamId,
                    userHandle: req.user.handle
                })
                .then(() => {
                    screamData.likeCount++;
                    return screamDocument.update({ likeCount: screamData.likeCount });
                })
                .then(() => {
                    return res.json(screamData);
                })
            } else {
                return res.status(400).json({ error: 'Scream alreay liked' });
            }
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.core });
        })
}