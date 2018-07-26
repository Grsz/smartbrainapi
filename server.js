const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const db = require('knex')({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      user : 'hrger',
      password : 'Xezeru007',
      database : 'hrger'
    }
  });


const app = express();

app.use(bodyParser.json());
app.use(cors())

app.get('/', (req, res) => {
    res.send(database.users)
})

//amint a Signin.js onSubmitSignin() aktiválódik, a beviteli mezők értékét küldi a /signin endpontra. A login adatbázist használjuk, ahová a regisztráció során bekerültek az adatok, itt csak ellenőrzés történik. Kiválasztjuk a login táblából az email és hash oszlopot, és kikeressük azt a sort, ahol az email megegyezik a Signin.js által küldött req.body.emaillel. Aztán az adat feldolgozása előtt bcyrpttel összhasonlítjuk a kapott sor hash oszlopával való metszetét a kapott req.body.passworddal. Ha egyezik, akkor kiválasztjuk az összes elemet az users táblából, ahol az email megegyezik a küldött req.body.emaillel, és ha létezik az elem, akkor visszaküldjük válaszként a Signin.js-nek.
app.post('/signin', (req, res) => {
    db.select('email', 'hash').from('login')
        .where({'email': req.body.email})
        .then(data => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
            if (isValid){
                return db.select('*').from('users').where({email: req.body.email})
                .then(user => {res.json(user[0])})
                .catch(err => res.status(400).json('unable to get user'))
            } else {res.status(400).json('wrong data')}
        })
    .catch(err => res.status(400).json('wrong data'))
})
//a req.body-t a Register.js-nél beállítjuk, hogy a beviteli mezők értékei legyen. A Register.js-ben amint megnyomásra kerül a register gomb (Register.props.onSubmitSignIn()), a /register endpointra postolja (req) bodyban az emailt, namet, passwordot. A szerver a bodyparserrel a kapott információkat feldolhozza a req.body-ban. A passwordot a bcrypt-tel dolgozzuk fel, és kapunk egy hash-t. 
//Ahhoz hogy a regsztációból kapott adatokat a loginhoz fel tudjuk használni, az users és a login táblának együtt kell dolgoznia. Ehhez csinálunk egy tranzakciót, aminek a lényege, hogy csak akkor hajtódnak végre a feladatok, ha minden feladat sikeresen végrehajtódott (COMMIT). Ehhez egy ideiglenes adatbázist használunk, a trx-et (db helyett). A req.body.passwordból kapott adatot titkosítottuk, a hash-t (jelszó titkosított változata) titkosítottuk bcrypttel, a hash elembe tároljuk, és beletesszük a trx adatbázisának hash oszlopába, az emailt pedig az emailbe, ezeket pedig a login táblába. Ebből pedig visszakérjük az emailt. Aztán az emailt loginEmailnek nevezzük el (elem lesz belőle). 
//Visszaadjuk azt, hogy vesszük az ideiglenes adatbázisunk (trx) users tábláját, kérjük a tábla elemeit, abba pedig beillesztjük az email oszlopba a loginemail array első elemét (mindig arrayt kapunk), névként a req.body.name-t, a joined oszlopba pedig az aktuális dátumot illesztjük. Aztán válaszként küldjük a kapott user array első elemét.
//Ha a felsoroltaknak minden eleme sikerült, akkor végrehajtjuk őket (trx.commit).
app.post('/register', (req, res) => {
    const {email, name, password} = req.body;
    const hash = bcrypt.hashSync(password);
        db.transaction(trx => {
            trx.insert({
                hash: hash,
                email: email
            })
            .into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                .returning('*')
                .insert({
                    email: loginEmail[0],
                    name: name,
                    joined: new Date()
                }).then(user => {
                    res.json(user[0]);
                })
            })
            .then(trx.commit)
            .catch(trx.rollback)
        })
    .catch(err => res.status(400).json('unable to register'))
})
//a req.params az endpointban a :id, amit az url-ben egy értékként írunk be pl /profile/1. Így a req.params.id az 1 lesz. Az adatbázisból kiválasztjuk az összes olyan sort (itt csak egyet) az users táblából, ahol az users.id oszlopban a req.params.id megegyezik. Ezután válaszként megkapjuk az usert (akkor is ha nem létezik, ugyanis üres arrayt kapunk, emiatt csak akkor fogadjuk el, és küldjük tovább az usert válaszként, ha az array tartalmaz elemeket.)
app.get('/profile/:id', (req, res) => {
    const {id} = req.params; //req.params.id
    db.select('*').from('users').where({
        id: id
    }).then(user => {
        if(user.length){
            res.json(user[0]);
        } else {
            res.status(400).json('not found')
        }
    })
    .catch(err => res.status(400).json('error getting user'))
})
//az egyetlen dolog amit itt teszünk, hogy az App.js-ben az onSubmit funkcióval (az ImageLinkForm.js jellemzőjén - Submit keresztül) a kép urljét az App állapotában tároljuk, azt továbbadjuk a clarifainak, és az ha válaszol, küldi ide az id-t (a req.body.id-ben). Az users táblában megkeressük azt a sort, ahol az id oszlop tagja megegyezik az app által küldött idvel. Aztán egyszerűsített módon UPDATE-ljük a sor entries oszlopával való metszetét úgy, hogy az ott lévő számot növeljük egy-gyel, ahányszor a PUT megtörténik. aztán a szokásos .returninggal kérjük, hogy a tábla elemét adja vissza, majd válaszként a kapott array első elemét küldjük vissza
app.put('/image', (req, res) => {
    const {id} = req.body; //req.body.id
    //db('users').where('id', '=', id)
    db('users').where({
        id: id
    })
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
        res.json(entries[0]);
    })
    .catch(err => res.status(400).json('unable to get entries'))
})


app.listen(3001, () => {
    console.log('app is running on port 3001')
})