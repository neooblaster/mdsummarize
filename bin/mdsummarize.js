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
    shortopt: "hd:vr",
    longopt: [
        "help",
        "dir:",
        "debug",
        "no-color",
        "verbose",
        "recursive"
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
                "\s": "-",   // Replace spaces with dash
                "\.": "",    // Replace dot    with nothing
                "'": "",     // Replace quote  with nothing
                "`": "",     // Replace        with nothing
                ":": "",     // Replace colon  with nothing
                "-{2,}": "-" // Replace double dash by one
            },
            // List of function to executes with arg
            // This will be the stringMacth (title text)
            // Name is for debugging
            "functions": [
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


        // @TODO : >>> ICI >>>>>>> PARSE
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
            // @TODO : >>> ICI >>>>>>> PARSE
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
            summary = openTag + os.EOL + summary + os.EOL + closeTag;
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

function call_user_func_array (cb, parameters) {
    // eslint-disable-line camelcase
    //  discuss at: https://locutus.io/php/call_user_func_array/
    // original by: Thiago Mata (https://thiagomata.blog.com)
    //  revised by: Jon Hohle
    // improved by: Brett Zamir (https://brett-zamir.me)
    // improved by: Diplom@t (https://difane.com/)
    // improved by: Brett Zamir (https://brett-zamir.me)
    //      note 1: Depending on the `cb` that is passed,
    //      note 1: this function can use `eval` and/or `new Function`.
    //      note 1: The `eval` input is however checked to only allow valid function names,
    //      note 1: So it should not be unsafer than uses without eval (seeing as you can)
    //      note 1: already pass any function to be executed here.
    //   example 1: call_user_func_array('isNaN', ['a'])
    //   returns 1: true
    //   example 2: call_user_func_array('isNaN', [1])
    //   returns 2: false

    var $global = (typeof window !== 'undefined' ? window : global);
    var func;
    var scope = null;

    var validJSFunctionNamePattern = /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/

    if (typeof cb === 'string') {
        if (typeof $global[cb] === 'function') {
            func = $global[cb]
        } else if (cb.match(validJSFunctionNamePattern)) {
            func = (new Function(null, 'return ' + cb)()) // eslint-disable-line no-new-func
        }
    } else if (Object.prototype.toString.call(cb) === '[object Array]') {
        if (typeof cb[0] === 'string') {
            if (cb[0].match(validJSFunctionNamePattern)) {
                func = eval(cb[0] + "['" + cb[1] + "']") // eslint-disable-line no-eval
            }
        } else {
            func = cb[0][cb[1]]
        }

        if (typeof cb[0] === 'string') {
            if (typeof $global[cb[0]] === 'function') {
                scope = $global[cb[0]]
            } else if (cb[0].match(validJSFunctionNamePattern)) {
                scope = eval(cb[0]) // eslint-disable-line no-eval
            }
        } else if (typeof cb[0] === 'object') {
            scope = cb[0]
        }
    } else if (typeof cb === 'function') {
        func = cb
    }

    if (typeof func !== 'function') {
        throw new Error(func + ' is not a valid function')
    }

    return func.apply(scope, parameters)
}

function array_merge () {
    // eslint-disable-line camelcase
    //  discuss at: https://locutus.io/php/array_merge/
    // original by: Brett Zamir (https://brett-zamir.me)
    // bugfixed by: Nate
    // bugfixed by: Brett Zamir (https://brett-zamir.me)
    //    input by: josh
    //   example 1: var $arr1 = {"color": "red", 0: 2, 1: 4}
    //   example 1: var $arr2 = {0: "a", 1: "b", "color": "green", "shape": "trapezoid", 2: 4}
    //   example 1: array_merge($arr1, $arr2)
    //   returns 1: {"color": "green", 0: 2, 1: 4, 2: "a", 3: "b", "shape": "trapezoid", 4: 4}
    //   example 2: var $arr1 = []
    //   example 2: var $arr2 = {1: "data"}
    //   example 2: array_merge($arr1, $arr2)
    //   returns 2: {0: "data"}

    var args = Array.prototype.slice.call(arguments)
    var argl = args.length
    var arg
    var retObj = {}
    var k = ''
    var argil = 0
    var j = 0
    var i = 0
    var ct = 0
    var toStr = Object.prototype.toString
    var retArr = true

    for (i = 0; i < argl; i++) {
        if (toStr.call(args[i]) !== '[object Array]') {
            retArr = false
            break
        }
    }

    if (retArr) {
        retArr = []
        for (i = 0; i < argl; i++) {
            retArr = retArr.concat(args[i])
        }
        return retArr
    }

    for (i = 0, ct = 0; i < argl; i++) {
        arg = args[i]
        if (toStr.call(arg) === '[object Array]') {
            for (j = 0, argil = arg.length; j < argil; j++) {
                retObj[ct++] = arg[j]
            }
        } else {
            for (k in arg) {
                if (arg.hasOwnProperty(k)) {
                    if (parseInt(k, 10) + '' === k) {
                        retObj[ct++] = arg[k]
                    } else {
                        retObj[k] = arg[k]
                    }
                }
            }
        }
    }

    return retObj
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
    // let colors = opt.getColors();
    // colors = removeColor(colors);
    // opt.setColors(colors);
}



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
