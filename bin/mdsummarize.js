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
//@TODO : Check si run existe !



/**
 * ----------------------------------------------------------------------------
 * Dependencies Loading & Program settings.
 * ----------------------------------------------------------------------------
 */
// Native NodeJS Dependencies :
const os       = require('os');
const fs       = require('fs');
const readline = require('readline');

// Dependencies :
const opt = require('ifopt');



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
    shortopt: "hd:v",
    longopt: [
        "help",
        "dir:",
        "debug",
        "no-color",
        "verbose"
    ],
};

// Source: https://misc.flogisoft.com/bash/tip_colors_and_formatting
// opt.setColor('fg.Debug', '\x1b[38;5;208m');



/**
 * ----------------------------------------------------------------------------
 * Global Variables Déclaration.
 * ----------------------------------------------------------------------------
 */
let PWD      = process.env.PWD;
let SHOWHELP = true;
let DEBUG    = false;
let VERBOSE  = false;
let OPTS     = [];
let log      = opt.log;
let clog     = console.log;


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


/**
 * ----------------------------------------------------------------------------
 * Lecture des arguments du script.
 * ----------------------------------------------------------------------------
 */
OPTS = opt.getopt(options.shortopt, options.longopt);



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
    let colors = opt.getColors();
    colors = removeColor(colors);
    opt.setColors(colors);
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


//@TODO:Rewrite HERE <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
// Effectuer le traitement
if (canRun()) {
    // Now issue with cli options, so do not display cli help.
    //----------------------------------------------------------------------
    SHOWHELP = false;
}



// Afficher l'aide si pas de traitement
if (SHOWHELP) {
    help();
}
