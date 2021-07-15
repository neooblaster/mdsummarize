#!/usr/bin/env node
/**
 * ----------------------------------------------------------------------------
 * mdsummarize.js
 *
 * @author    Nicolas DUPRE (VISEO)
 * @release   09.04.2020
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
// const dbgopn = '>>>--------------[ DEBUG DUMP ]-----------------';
const dbgopn = '';
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
    shortopt: "hd:vrp:",
    longopt: [
        "help",
        "dir:",
        "debug",
        "no-color",
        "verbose",
        "recursive",
        "profile"
    ]
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
        "closeTag": "[](EndSummary)",
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
            "pattern": /^\s*(#+)\s*(.*)$/gm, // Title text is in match 2
            "levelMatch": 1,                 // Which match the title level is
            "stringMatch": 2,                // Which match the title text  is
            "levelType": "string",           // Type of data composing the level
            "levelIndicator": "#"            // Entity defining the title level
        },
        // Settings to rewrite links and fixe some char
        "substitution": {
            // Liste of char replacement
            "chars": {
                "'": "",      // Replace quote  with nothing
                "`": "",      // Replace        with nothing
                ":": "",      // Replace colon  with nothing
                "-{2,}": "-"  // Replace double dash by one
            },
            // List of function to executes with arg
            // This will be the stringMacth (title text)
            // Name is for debugging
            "functions": [
                {
                    function: function () {
                        let str = this;
                        // Removes
                        str = str.replace(/[`()]/g, '');
                        // replaces
                        str = str.replace(/(\s)/g, '-');
                        return str;
                    }, name: "specialCharRemove",
                    args: []
                },
                {
                    function: function () {
                        return this.toLowerCase();
                    }, name: "toLowerCase",
                    args: []
                },
                {
                    function: function () {
                        return encodeURI(this);
                    }, name: "encodeURI",
                    args: []
                }
            ],
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
function fileExists(path, level = 1) {
    try {
        fs.accessSync(path, fs.constants.F_OK | fs.constants.W_OK, (err) => {
            if (err) {
                throw err;
            }
        });

        return true;
    } catch(err) {
        log(err.toString(), level);
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
    let tag = LANG_SETTINGS.markdown.insertTag;
    let helpText = `
Usage : ${name} [OPTIONS]
------------------------------------------------------------

{{${name}}} generates sumarizes for all Markdown file found
in the specified folder which contain the tag :

                    {{${tag}}}

{{-h}}, {{--help}}        Display this text.
{{-r}}, {{--recursive}}   Display this text.
{{-d}}, {{--dir}}         Set the working directory.
{{-v}}, {{--verbose}}     Verbose Mode.
    {{--debug}}       Debug Mode.
    {{--no-color}}    Remove color in the console. Usefull to
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
        secure: function(delimiter) {
            // return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            // return string.replace(/[-[\]\/{}()*+?.\\^$|]/g, "\\$&");
            return (string + '')
                .replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&')
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
    if (LANGUAGES.lastIndexOf(langName) >= 0) return false;

    LANGUAGES.push(langName);
    addAlias(langName, configName);

    return true;
}

/**
 * Enregistre un alias de nom de langue vers un nom reel.
 *
 * @param {String} aliasName Nom d'alias au format chaine de caractère alphanumérique.
 * @param {String} realName  Nom de langue réel permetant l'utilisation de la configuration associée.
 *
 * @return {boolean}
 */
function addAlias(aliasName, realName) {
    // Can we find an associated configuration
    if (!LANG_SETTINGS[realName]) {
        log("The configuration %s is not registred.",
            1,
            [realName]
        );
    }

    ALIASES[aliasName] = realName;

    return true;
}

/**
 *
 * @param path
 * @param root indicating if we are processing root requested directory
 * @return {boolean}
 */
function parse(path, root = true) {
    // Get file data
    let fStat = fs.statSync(path);

    // If the location is a directory,
    // read the dir only if recursive is requested.
    if (fStat.isDirectory() && (opt.isOption(['r', 'recursive']) || root)) {
        let dirContent = fs.readdirSync(path);
        dirContent.forEach(function (file) {
            // Do not process browse refernce (. and ..)
            if (!/^\.{1,2}$/.test(file)) {
                parse(`${path}/${file}`, false);
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
            let realName = LANGUAGES[i];
            let extension = LANG_SETTINGS[realName]['extension'];

            if (extension.test(path)) {
                configName = realName;
                returnFlag = false;
                break;
            }
        }

        if (returnFlag) return false;

        /**
         * Phase de traitement du texte.
         *
         * @var {String}  text            Text à traiter.
         * @var {Array}   titles          Liste des titres identifiés.
         * @var {Array}   config          Ensemble des paramètre de configuration du language.
         * @var {String}  insertTag       Balise d'insertion du sommaire.
         * @var {String}  opentag         balise ouvrante du sommaire.
         * @var {String}  closeTag        Balise fermante du sommaire.
         * @var {Integer} startLevel      Niveau à partir duquel on commence le sommaire.
         * @var {Integer} endLevel        Niveau à partir duquel on arrête le sommaire.
         * @var {Boolean} tabulated       Indique s'il faut généré des tabulations en accord avec le niveau.
         * @var {Integer} tabsize         Lorsque tabulé, indique la taille en espace de la tabulation.
         * @var {Integer} taboffset       Permet d'ajouter un décallage avant ou arriere (-) pour la tabulation.
         * @var {Array}   subChar         Liste des substitution de caractères.
         * @var {Array}   subFunc         Liste des functons à appliqué sur le titre substitué.
         * @var {Boolean} eol             Indique qu'il faut inséré un retour chariot.
         * @var {Array}   titleCfg        Ensemble des paramètre de configuration pour l'analyse des titres.
         * @var {String}  titlePattern    Modèle d'identification des titres.
         * @var {String}  levelMatch      Index de capture dans lequel l'indicateur de niveau de titre est stocké.
         * @var {String}  levelType       Type de l'élément permettant l'identification du niveau du titre.
         * @var {String}  levelIndicator  Modèle d'identification du niveau de titre.
         * @var {String}  stringMatch     Index de capture dans lequel le titre est stocké.
         */
        let text = getFileContent(path);
        let titles = [];

        let config = LANG_SETTINGS[configName];

        let insertTag = config['insertTag'];
        let insertTagX = new RegExp(pattern(config['insertTag']).secure());
        let openTag = config['openTag'];
        let openTagX = new RegExp(pattern(config['openTag']).secure());
        let closeTag = config['closeTag'];
        let closeTagX = new RegExp(pattern(config['closeTag']).secure());

        let linkable = config['linkable'];          // @TODO not implemented
        let createAnchor = config['createAnchor'];  // @TODO not implemented
        let style = config['style'];                // @TODO not implemented

        let tabulated = config['tabulated'];
        let tabspace = config['tabspace'];
        let tabsize = config['tabsize'];
        let taboffset = config['taboffset'];

        let eol = config['eol'];

        let titleCfg = config['title'];
        let titlePattern = titleCfg['pattern'];
        let levelMatch = titleCfg['levelMatch'];
        let stringMatch = titleCfg['stringMatch'];
        let levelType = titleCfg['levelType'].toLowerCase();
        let levelIndicator = titleCfg['levelIndicator'];

        let subChars = config['substitution']['chars'];
        let subFuncs = config['substitution']['functions'];

        let startLevel = config['startLevel'];
        let endLevel = config['endLevel'];


        /**
         * Check if the summary instruction is present
         */
        // Creation instruction
        if (insertTagX.test(text)) {
            continueFlag = true;
        }
        // Existing Summary to update
        if (
            !continueFlag
            && openTagX.test(text)
            && closeTagX.test(text)
        ) {
            continueFlag = true;
            summaryUpdate = true;
        }

        if (!continueFlag) {
            if (DEBUG) {
                log("Summary tag not found for file %s", 4, [filename]);
            }

            return false;
        }


        /**
         * Récupération de tous les titres.
         */
        // Liste des match dans un array
        //  n index par match :
        //      0 => # <your title name>
        //      1 => #
        //      2 => <your title name>
        //  index
        //  input
        //  groups
        titles = [...text.matchAll(titlePattern)];

        /**
         * Calcul du niveau du titre
         */
        for (let title in titles) {
            title = titles[title];
            // Remove source input
            title.input = 'cleared in function parse()';

            let levelStr = title[levelMatch];
            let level = 0;

            // levelType set to String
            if (levelType === 'string') {
                level = substr_count(levelStr, levelIndicator);
            }

            title.titleLevel = level;
        }

        if (DEBUG) {
            log("File %s : Please find below matched titles :", 4, [filename]);
            clog(dbgopn); cdir(titles); clog(dbgcls);
        }

        /**
         * Summary Creation
         */
        let numerization = [];
        let summary = "";

        for (let title in titles) {
            title = titles[title];

            if (DEBUG) {
                log("Debug for title %s, level %s:", 4, [title[0].trim(), title.titleLevel]);
            }

            /**
             * @var string  entry         Entrée de sortie, manipulé au fur est
             *                            à mesure des processus de construction.
             *
             * @var integer level         Niveau du titre en valeur numérique.
             * @var string  stringTitle   Reprise du titre tel qu'il est présent dans le document.
             * @var string  substitution  Titre de substitution utilisé dans l'ancrage.
             */
            let entry = config.substitution.final;
            let level = title.titleLevel;
            let stringTitle = title[stringMatch].trim();
            let substitution = stringTitle;

            // Si le niveau n'est pas admis
            if (!(level >= startLevel && level <= endLevel)) {
                if (DEBUG) {
                    log(" • Level %s is excluded", 4, [level]);
                    clog(dbgcls);
                }
                continue;
            }

            if (DEBUG) {
                log(" • Final substitution target entry: %s", 4, [entry]);
            }

            // Gestion de la tabulation
            if (tabulated) {
                let naturalOffset = 1 - startLevel;
                let multiplier = (level - 1 + taboffset + naturalOffset) * tabsize;
                let tabchar = ' ';

                if (!tabspace) {
                    tabchar = "\t";
                }

                entry = entry.replace('$t', tabchar.repeat(multiplier));

                if (DEBUG) {
                    log(" • Entry with %s (tabs) replaced [%s]", 4, ['$t', entry]);
                }
            }

            // Inserting Texte
            entry = entry.replace(`$${stringMatch}`, stringTitle);

            if (DEBUG) {
                log(" • Entry with %s (title match) replaced [%s]", 4, [`$${stringMatch}`, entry]);
                log(" • Perform substitutions :", 4, []);
            }

            // Procéder aux opérations de substitution.
            // Caractères (chars)
            for (let src in config.substitution.chars) {
                let target = config.substitution.chars[src];
                let _substitution = substitution;
                substitution = substitution.replace();

                if (DEBUG) {
                    log("    • Replace [%s] by [%s] in [%s] becomming [%s]",
                        4,
                        [src, target, _substitution, substitution]
                    );
                }
            }

            // Application de function (functions)
            for (let func of config.substitution.functions) {
                let _substitution = substitution;

                substitution = func.function.apply(substitution, func.args);

                if (DEBUG) {
                    log("    • [%s] becomes [%s] after execution of function %s",
                        4,
                        [_substitution, substitution, func.name]
                    );
                }
            }

            // Intégration de la substitution
            entry = entry.replace('$s', substitution);

            if (DEBUG) {
                log(" • Entry with %s replaced [%s]", 4, ['$s', entry]);
            }

            // Si EOL requested
            if (eol) entry += os.EOL;

            summary += entry;

            // In debug, set line to separate the title processing
            if (DEBUG) {
                clog(dbgcls);
            }
        }

        if (DEBUG) {
            log("Please find below the generated summary : \n", 4, []);
            clog(summary);
            clog(dbgcls);
        }

        // Intégration du sommaire dans le document
        if (summaryUpdate) {
            let replacePattern = new RegExp(
                `(${pattern(openTag).secure()})(.*)(${pattern(closeTag).secure()})`,
                's'
            );

            text = text.replace(replacePattern, `$1\n${summary}$3`);
        }
        else {
            summary = openTag + os.EOL + summary + closeTag;
            text = text.replace(insertTagX, summary);
        }

        // Mise à jour du fichier
        fs.writeFileSync(path, text, function (err) {
            if (err) {
                log(err, 1);
                return false;
            }

            log('ok', 0);
            return true;
        });
    }
}

/**
 * Count the number of substring occurrences.
 *
 * @param haystack   The string to search in
 * @param needle     The substring to search for
 * @param offset     The offset where to start counting.
 *                   If the offset is negative, counting starts from the end
 *                   of the string.
 * @param length     The maximum length after the specified offset to search for
 *                   the substring. It outputs a warning if the offset plus the
 *                   length is greater than the haystack length.
 *                   A negative length counts from the end of haystack.
 * @return {boolean|number}
 */
function substr_count (haystack, needle, offset, length) {
    // eslint-disable-line camelcase
    //  discuss at: https://locutus.io/php/substr_count/
    // original by: Kevin van Zonneveld (https://kvz.io)
    // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
    // improved by: Brett Zamir (https://brett-zamir.me)
    // improved by: Thomas
    //   example 1: substr_count('Kevin van Zonneveld', 'e')
    //   returns 1: 3
    //   example 2: substr_count('Kevin van Zonneveld', 'K', 1)
    //   returns 2: 0
    //   example 3: substr_count('Kevin van Zonneveld', 'Z', 0, 10)
    //   returns 3: false

    var cnt = 0;

    haystack += '';
    needle += '';
    if (isNaN(offset)) {
        offset = 0
    }
    if (isNaN(length)) {
        length = 0
    }
    if (needle.length === 0) {
        return false
    }
    offset--;

    while ((offset = haystack.indexOf(needle, offset + 1)) !== -1) {
        if (length > 0 && (offset + needle.length) > length) {
            return false
        }
        cnt++
    }

    return cnt;
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
addLangToProcess('markdown', 'markdown');



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

// Use specified profile @TODO: complete internal def with profil
// if (opt.isOption(['profile', 'p'])) {
//     let profile = opt.getOptValue(['profile', 'p']);
//     let moduleDir = nodepath.dirname(process.mainModule.filename);
//
//     fileExists(`${moduleDir}/../var/profiles/${profile}`);
//
//
// }



/**
 * ----------------------------------------------------------------------------
 * Traitement en fonction des options
 * ----------------------------------------------------------------------------
 */
// Display arguments & Language settings
if (DEBUG) {
    log('Command Line Options :', 4);
    clog(dbgopn); clog(OPTS); clog(dbgcls);

    log('Registred Languages with alias and Settings :', 4);
    clog(dbgopn);
    clog(LANGUAGES);
    clog();
    clog(ALIASES);
    clog();
    cdir(LANG_SETTINGS);
    clog(dbgcls);
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
