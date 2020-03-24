#!/usr/bin/env node
/**
 * ----------------------------------------------------------------------------
 * cegid_log_reader.js
 *
 * CLI script to process CEGID LOGS.
 *
 * @author    Nicolas DUPRE (VISEO)
 * @release   x.x.2020
 * @version   1.0.0
 *
 * ----------------------------------------------------------------------------
 */



/**
 * ----------------------------------------------------------------------------
 * Management Rules :
 *
 *    1.
 *
 * ----------------------------------------------------------------------------
 */



/**
 * ----------------------------------------------------------------------------
 * TODOS:
 * ----------------------------------------------------------------------------
 */




/**
 * ----------------------------------------------------------------------------
 * Dependencies Loading & Program settings.
 * ----------------------------------------------------------------------------
 */
// Native NodeJS Dependencies :
const os       = require('os');
const fs       = require('fs');
const readline = require('readline');
const nodepath = require('path');

// Dependencies :
const opt = require('ifopt');

// Constante
const dbgopn = '>>>--------------[ DEBUG DUMP ]-----------------';
const dbgcls = '<<<---------------------------------------------';



/**
 * ----------------------------------------------------------------------------
 * Internal Program Settings
 * ----------------------------------------------------------------------------
 */
// Caractères individuels (n'accepte pas de valeur)
// Caractères suivis par un deux-points (le paramètre nécessite une valeur)
// Caractères suivis par deux-points (valeur optionnelle)
const options = {
    separator: ",",
    shortopt: "hd:vr",
    longopt: [
        "help",
        "dir:",
        "debug",
        "no-color",
        "verbose",
        "recursive"
    ],
};

// Source: https://misc.flogisoft.com/bash/tip_colors_and_formatting
 opt.setColor('fg.Debug', '\x1b[38;5;208m');



/**
 * ----------------------------------------------------------------------------
 * Global Variables Déclaration.
 * ----------------------------------------------------------------------------
 */
let PWD       = process.env.PWD;
let SHOWHELP  = true;
let DEBUG     = false;
let VERBOSE   = false;
let OPTS      = [];
let log       = opt.log;
let clog      = console.log;

/**
 * @var array LANGUAGE Liste des languages à traiter.
 */
 */
let LANGUAGES = [];

/**
 * @var array $langRegister Registre des configurations fonctionnelles par langage de développement.
 */
let LANG_SETTINGS = {
    "markdown": {
        // Pattern to identify file type
        "extension": /\.md$/i,
        // Instruction to place generated summary
        "insertTag": "[](MakeSummary)",
        // Once summary is generated, an opening tag is add for further updates
        "openTag": "[](BeginSummary)",
        // Once summary is generated, an closing tag is add for further updates
        "closingTag": "[](EndSummary)",
        // @TODO : MakeSummary / Linkable
        "linkable": true,
        // @TODO : MakeSummary / Create Anchor
        "createAnchor": false,
        // @TODO : MakeSummary / Style (list type style)
        "style": "none",
        // Indicating if we add tabulation (space) by title level.
        "tabulated": true,
        // Indicating if tabulation are spaces char.
        "tabspace": true,
        // How many space char represent one tabulation.
        "tabsize": 4,
        // Add an offset for tabulation (if needed).
        "taboffset": 0,
        //
        "eol": true,
        // Title recognise settings
        "title": {
            "pattern": /^\s*(#+)\s*(.*)$/m,  // Title text is in match 2
            "levelMatch": 1,                 // Which match the title level is
            "stringMatch": 2,                // Which match the title text  is
            "levelType": "string",           // Type of data composing the level
            "levelIndicator": "#"            // Entity defining the title level
        },
        // Settings to rewrite links and fixe some char
        "substitution": {
            // Liste of char replacement
            "chars": {
                "\s": "-",   // Replace spaces with dash
                "\.": "",    // Replace dot    with nothing
                "'": "",     // Replace quote  with nothing
                "`": "",     // Replace        with nothing
                ":": "",     // Replace colon  with nothing
                "-{2,}": "-" // Replace double dash by one
            },
            // List of function to executes with arg
            "functions": {
                // urlencode []
                // strtolower []
            },
            // Final replacement for output in file :
            //  $t* is for tabluation(s).
            //  $x  is for match number x referinf to the title recognize pattern.
            //  $s  is for the substitution.
            "final": "$t* [$2](#$s)",
        },
        // From which level the summary begins
        "startLevel": 2,
        // Until which level the summary take into account levels
        "endLevel": 9
    }
};

/**
 * @var array ALIASES Liste d'alias pointant vers la configuration exacte pour le language à traiter.
 */
let ALIASES = {
    "markdown" : "markdown",
    "md" : "markdown"
};


/**
 * ----------------------------------------------------------------------------
 * Functions Declaration.
 * ----------------------------------------------------------------------------
 */
/**
 * Vérifie si le fichier demandé existe.
 *
 * @param path   Emplacement du fichier à contrôller.
 * @param level  Niveau d'erreur à retourner en cas d'échec.
 *
 * @returns {boolean}
 */
function fileExists(path, level) {
    try {
        fs.accessSync(path, fs.constants.F_OK | fs.constants.W_OK, (err) => {
            if (err) {
                throw err;
            }
        });

        return true;
    } catch(err) {
        log(err, level);
        process.exit();
    }
}

/**
 * Get the file content of the provided file path.
 *
 * @param {String}   file Path to the file we want to get the content.
 *
 * @return {String}  File content
 */
function getFileContent (file) {
    return fs.readFileSync(file, 'utf-8');
}

/**
 * Affiche le manuel d'aide.
 *
 * @param {Number} level  If we display the help next to an invalid command.
 *
 * @return void
 */
function help(level = 0) {
    let name = 'mdsumarize';
    let helpText = `
Usage : ${name} [OPTIONS]
------------------------------------------------------------

{{${name}}} generates sumarizes for all Markdown file found
in the specified folder which contain the tag {{&lt;tag&gt;}}.

{{-h}}, {{--help}}     Display this text.
{{-d}}, {{--dir}}      Set the working directory.
{{-v}}, {{--verbose}}  Verbose Mode.
    {{--debug}}    Debug Mode.
    {{--no-color}} Remove color in the console. Usefull to
               redirect log in a debug file.

Details :
  
    `;

    helpText = helpText.replace(
        /{{(.*?)}}/g,
        `${opt.colors.fg.Yellow}$1${opt.colors.Reset}`
    );

    console.log(helpText);
    if (level) process.exit();
}

/**
 * Vérifie si l'on peu effectuer une opération de chiffrage ou déchiffrage.
 *
 * @return boolean.
 */
function canRun() {
    // Do not run if help is requested
    return !opt.isOption(['h', 'help']);
}

/**
 * Get all entered input files.
 *
 * @returns {Array}  List of input files.
 */
// function getXXX() {
//     return getOpts(['i', 'in-source']);
// }

/**
 * RegExp Pattern tool.
 *
 * @param string
 *
 * @return {{secure: (function(): void | *), make: (function(): void | *)}}
 */
function pattern(string) {
    return {
        /**
         * Converti la chaine en expression régulière.
         *
         * @return {*}
         */
        make: function() {
            let pattern = string;

            pattern = pattern.replace(/(\s*)([xyz]){2,}(\s*)/gi, '$1([a-zA-Z0-9-_.]+)$3');

            return pattern;
        },

        /**
         * Sécurise la chaine en expression régulière valide en échappant les caractères reservés.
         *
         * @return {String|void}
         */
        secure: function() {
            // return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            return string.replace(/[-[\]\/{}()*+?.\\^$|]/g, "\\$&");
        }
    };
}

/**
 * Display all the data structure.
 *
 * @param object
 */
function cdir(object) {
    console.dir(object, {depth: null});
}

/**
 * The all values of the povided structure to a empty value.
 *
 * @param {Object} object   JavaScript object structure to nullify.
 *
 * @return {*}
 */
function removeColor(object) {
    for (let pty in object) {
        if (object.hasOwnProperty(pty)) {
            if (typeof object[pty] === 'string') {
                object[pty] = '';
            }
            if (object[pty] instanceof Object) {
                object[pty] = removeColor(object[pty]);
            }
        }
    }

    return object;
}

function addLangToProcess(langName, configName = 'markdown') {
    // Si the language is not in the list to process
    // Registred it
    if (LANGUAGES.lastIndexOf(langName)) return false;

    LANGUAGES.push(langName);
    addAlias(langName, configName);

    return true;
}

function adddAlias(aliasName, realName) {
    // Can we find an associated configuration
    if (!ALIASES[realName]) {
    }



}

function parse(path) {
    // Get file data
    let fStat = fs.statSync(path);

    // If the location is a directory,
    // read the dir only if recursive is requested.
    if (fStat.isDirectory() && opt.isOption(['r', 'recursive'])) {
        let dirContent = fs.readdirSync(path);
        dirContent.forEach(function (file) {
            // Do not process browse refernce (. and ..)
            if (!/^\.{1,2}$/.test(file)) {
                parse(`${path}/${file}`);
            }
        });
    }
    // If the location is a file, parse the file
    else {
        /**
         * Phase d'initialisation :: Données transverses.
         *
         * @var {string} configName      Nom réel correspondant à la configuration à utiliser.
         * @var {array}  options         Options fournies dans la ligne de commande.
         * @var {bool}   summaryUpdate   Indique s'il s'agit d'une mise à jour de sommaire.
         * @var {bool}   continue        Indique si l'on continue le processus de sommairisation.
         * @var {bool}   debug           Affiche des messages détaillés pour le debugguage.
         */
        let configName    = null;
        let options       = OPTS;
        let summaryUpdate = false;
        let continueFlag  = false;
        let debug         = OPTS.debug || false;



        /**
         * Phase de contrôle.
         *
         * Récupération du fichier.
         *
         * @var string $filename Nom du fichier au format name.ext
         */
        let filename = nodepath.basename(path);



        /**
         * Est-ce un fichier à traiter.
         *
         * @var {boolean} return Indicateur demandant l'envois final false. Fin du traitement.
         */
        let returnFlag = true;

        for (let i in LANGUAGES) {
        }



    }
}


/**
 * ----------------------------------------------------------------------------
 * Lecture des arguments du script.
 * ----------------------------------------------------------------------------
 */
OPTS = opt.getopt(options.shortopt, options.longopt);



/**
 * ----------------------------------------------------------------------------
 * Initializations
 * ----------------------------------------------------------------------------
 */
// Set default language processed
addLangToProcess('markdown');



/**
 * ----------------------------------------------------------------------------
 * Traitement des options
 * ----------------------------------------------------------------------------
 */
// Flag for Verbose mode (Log info message)
if (OPTS.v || OPTS.verbose) {
    VERBOSE = true;
}

// Flag for Debug Mode (Advance debug detail for dev)
if (OPTS.d || OPTS.debug) {
    DEBUG = true;
}

if (OPTS['no-color']) {
    // let colors = opt.getColors();
    // colors = removeColor(colors);
    // opt.setColors(colors);
}



/**
 * ----------------------------------------------------------------------------
 * Traitement en fonction des options
 * ----------------------------------------------------------------------------
 */
// Display arguments
if (DEBUG) {
    log('Command Line Options :', 4);
    clog(dbgopn); clog(OPTS); clog(dbgcls);
}


// Afficher l'aide si demandée
if (OPTS.h || OPTS.help) {
    help();
    // Do not display again the help.
    SHOWHELP = false;
}



// Effectuer le traitement
if (canRun()) {
    let directory = OPTS.d || OPTS.dir;     // Try to get option

    // If option found else use PWD
    if (directory) {
        directory = directory.val;
    } else {
        directory = PWD;
    }

    let fullpath = directory;

    // Check root path for linux (/path/to) and windows (c:\)
    if (!/^\/|[a-zA-Z]{1}:/.test(directory)) {
        fullpath = `${PWD}/${directory}`;
    }

    if (VERBOSE || DEBUG) {
        log("Processing directory : %s", 3, [fullpath]);
    }

    // Check if directory exist
    fileExists(fullpath, 1);

    // Processing
    parse(fullpath);


    // Now issue with cli options, so do not display cli help.
    //----------------------------------------------------------------------
    SHOWHELP = false;
}



// Afficher l'aide si pas de traitement
if (SHOWHELP) {
    help();
}
