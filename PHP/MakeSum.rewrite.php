<?php
class MakeSum
{
    /**
     * @var string $workdir Dossier de travail
     */
    protected $workdir = null;

    /**
     * @var string $cmdName Nom de la commande
     */
    protected $cmdName = null;

    /**
     * @var array $argv
     */
    protected $argv = null;

    /**
     * @var string $defaultLang Langage par default définie pour traiter l'emplacement demandé.
     */
    protected $defaultLang = "markdown";

    /**
     * @var bool|resource $psdtout Pointeur vers la ressource de sortie standard.
     */
    protected $psdtout = STDOUT;

    /**
     * @var bool|resource $pstderr Pointeur vers la ressource de sortie des erreurs.
     */
    protected $pstderr = STDERR;

    /**
     * @var bool $noDie Flag pour ne pas jouer les evenements die.
     */
    protected $noDie = false;

    /**
     * Enregistre un alias de nom de langue vers un nom reel.
     *
     * @param string $aliasName Nom d'alias au format chaine de caractère alphanumérique.
     * @param string $realName  Nom de langue réel permetant l'utilisation de la configuration associée.
     *
     * @return true
     */
    public function addAlias ($aliasName, $realName)
    {
        // Peut-on trouver une configuration associée ?
        if (!array_key_exists($realName, $this->langRegister)) $this->stderr(
            'The configuration %s is not registred. Please use registerLang.', [$realName]
        );

        $this->langAliases[$aliasName] = $realName;

        return true;
    }

    /**
     * Met en évidence les valeurs utilisateur dans les messages
     *
     * @param  string $message Message à analyser
     *
     * @return string $message Message traité
     */
    protected function highlight($message)
    {
        $color_in = self::OPTIONS['colors']['color_in'];

        // A tous ceux qui n'ont pas de couleur spécifiée, alors saisir la couleur par défaut
        $message = preg_replace("/(?<!>)(%[a-zA-Z0-9])/", "$color_in>$1", $message);

        // Remplacer par le code de colorisation Shell
        $message = preg_replace("#([0-9]+)>(%[a-zA-Z0-9])#", "\e[38;5;$1m$2\e[0m", $message);

        return $message;
    }

    protected function parse ($path)
    {
        // S'il s'agit d'un dossier, le parcourir.
        if (is_dir($path)) {
            // DONE
        }
        // S'il s'agit d'un fichier, l'analyser.
        else {
            /**
             * Est-ce un fichier à traiter.
             *
             * @var bool $return Indicateur demandant l'envois final false. Fin du traitement.
             */
//            $return = true;

            // @TODO : >>> ICI >>>>>>> LANGUIAGES
            foreach ($this->LANGUIAGES as $langIdx => $langName) {
                $realName = $this->langAliases[$langName];
                $extension = $this->langRegister[$realName]['extension'];

                if (preg_match($extension, $filename)) {
                    $configName = $realName;
                    $return = false;
                    break;
                }
            }

            if ($return) return false;


            /**
             * Phase de traitement du texte.
             *
             * @var string  $text            Text à traiter.
             * @var array   $titles          Liste des titres identifiés.
             * @var array   $config          Ensemble des paramètre de configuration du language.
             * @var string  $insertTag       Balise d'insertion du sommaire.
             * @var string  $openTag         Balise ouvrante du sommaire.
             * @var string  $closeTag        Balise fermante du sommaire.
             * @var integer $startLevel      Niveau à partir duquel on commence le sommaire.
             * @var integer $endLevel        Niveau à partir duquel on arrête le sommaire.
             * @var boolean $tabulated       Indique s'il faut généré des tabulations en accord avec le niveau.
             * @var integer $tabsize         Lorsque tabulé, indique la taille en espace de la tabulation.
             * @var integer $taboffset       Permet d'ajouter un décallage avant ou arriere (-) pour la tabulation.
             * @var array   $subChar         Liste des substitution de caractères.
             * @var array   $subFunc         Liste des functons à appliqué sur le titre substitué.
             * @var boolean $eol             Indique qu'il faut inséré un retour chariot.
             * @var array   $titleCfg        Ensemble des paramètre de configuration pour l'analyse des titres.
             * @var string  $titlePattern    Modèle d'identification des titres.
             * @var string  $levelMatch      Index de capture dans lequel l'indicateur de niveau de titre est stocké.
             * @var string  $levelType       Type de l'élément permettant l'identification du niveau du titre.
             * @var string  $levelIndicator  Modèle d'identification du niveau de titre.
             * @var string  $stringMatch     Index de capture dans lequel le titre est stocké.
             */
            $text = file_get_contents($path);
            $titles = [];

            $config = $this->langRegister[$configName];

            $insertTag = $config['insertTag'];
            $openTag = $config['openTag'];
            $closeTag = $config['closeTag'];

            $startLevel = $config['startLevel'];
            $endLevel = $config['endLevel'];

            $tabulated = $config['tabulated'];
            $tabsize = $config['tabsize'];
            $taboffset = $config['taboffset'];

            $subChar = $config['substitution']['chars'];
            $subFunc = $config['substitution']['functions'];

            $eol = $config['eol'];

            $titleCfg = $config['title'];
            $titlePattern = $titleCfg['pattern'];
            $levelMatch = $titleCfg['levelMatch'];
            $levelType = strtolower($titleCfg['levelType']);
            $levelIndicator = $titleCfg['levelIndicator'];
            $stringMatch = $titleCfg['stringMatch'];



            /**
             * Est-ce que les indicateurs de construction automatique du sommaire sont présent ?
             */
            // Indicateur de création de sommaire
            if (preg_match(preg_quote("/$insertTag/"), $text)) {
                $continue = true;
            }
            // Indicateurs de présence de sommaire => Mise à jour
            if (
                !$continue
                && preg_match(preg_quote("/$openTag/"), $text)
                && preg_match(preg_quote("/$closeTag/"), $text)
            ) {
                $continue = true;
                $summaryUpdate = true;
            }

            if (!$continue) return false;


            /**
             * Récupération de tous les titres.
             */
            preg_match_all($titlePattern, $text, $titles);


            /**
             * Inversion du regroupement des matches
             */
            $this->preg_match_reverse_grouping($titles);


            /**
             * Calcul du niveau du titre
             */
            foreach ($titles as $index => &$title) {
                $levelStr = $title[$levelMatch];
                $level = 0;

                if ($levelType === 'string') {
                    $level = substr_count($levelStr, $levelIndicator);
                }

                $title['titleLevel'] = $level;
            }
            unset($title);

            if ($debug) {
                $this->stdout(
                    ">>> Please find below matched titles %s",
                    [print_r($titles, true)],
                    "DEBUG"
                );
                $this->stdout("<<< End of Title Calculation.", [], "DEBUG");
            }


            /**
             * Création du sommaire
             */
            $numerization = [];
            $summary = "";

            foreach ($titles as $index => $title) {
                /**
                 * @var string  $entry         Entrée de sortie, manipulé au fur est à mesure des processus de
                 * construction.
                 *
                 * @var integer $level         Niveau du titre en valeur numérique.
                 * @var string  $stringTitle   Reprise du titre tel qu'il est présent dans le document.
                 * @var string  $substitution  Titre de substitution utilisé dans l'ancrage.
                 */
                $entry = $config['substitution']['final'];
                $level = $title["titleLevel"];
                $stringTitle =  trim($title[$stringMatch]);
                $substitution = $stringTitle;

                // Si le niveau n'est pas admis, on l'ignore
                if (!($level >= $startLevel && $level <= $endLevel)) continue;

                // Gestion de la tabulation si demandée.
                if ($tabulated) {
                    $naturalOffset = 1 - $startLevel;
                    $multiplier = ($level - 1 + $taboffset + $naturalOffset) * $tabsize;

                    $entry = str_replace('$t', str_repeat(" ",$multiplier), $entry);
                }

                // Insertion du texte d'origine.
                $entry = str_replace(
                    '$' . $stringMatch,
                    $stringTitle,
                    $entry
                );

                // Procéder aux opération de substitution.
                // Caractères (char)
                foreach ($subChar as $src => $sub) {
                    $substitution = preg_replace("/$src/", $sub, $substitution);
                }
                // Application de function (functions)
                foreach ($subFunc as $fn => $arg) {
                    $substitution = call_user_func_array($fn, array_merge([$substitution], $arg));
                }
                // Intégration de la substitution
                $entry = str_replace('$s', $substitution, $entry);

                // Si demandé, insertion d'un EndOfLine.
                if ($eol) {
                    $entry .= PHP_EOL;
                }

                $summary .= $entry;
            }

            if ($debug) {
                $this->stdout(
                    ">>> Please find below the generated summary : \n\n%s",
                    [$summary],
                    "DEBUG"
                );
                $this->stdout("<<< End of Generated Summary.", [], "DEBUG");
            }


            /**
             * Intégration du sommaire dans le document
             */
            if ($summaryUpdate) {
                $summaryBlockPattern = "/(" . preg_quote($openTag) .
                    ")(.*)(" . preg_quote($closeTag) .
                    ")/s";

                $text = preg_replace($summaryBlockPattern,
                    "$1\n$summary$3",
                    $text
                );
            } else {
                $summary = $openTag . PHP_EOL . $summary . PHP_EOL . $closeTag . PHP_EOL;
                $text = preg_replace(preg_quote("/$insertTag/"), $summary, $text);
            }


            /**
             * Mise à jour du fichier
             */
            if ($debug) {
                $this->stdout("1%s", ["In debug mode, no changes are applied to files."], "DEBUG");
            }
            else {
                file_put_contents($path, $text);
            }
        }

        return true;
    }

    /**
     * Regroupe les matches au sein du même tableau au lieu du regroupement par défaut.
     *
     * @param array $array Référence à inverser.
     *
     * @return bool
     */
    protected function preg_match_reverse_grouping (Array &$array)
    {
        if (!count($array)) return false;

        if (!is_array($array[0]) || !count($array[0])) return false;

        $matches = count($array);
        $reversed = [];

        foreach ($array[0] as $index => $match) {
            $instance = [];
            $instance[0] = $match;

            for ($i = 1; $i < $matches; $i++) {
                $instance[$i] = $array[$i][$index];
            }

            $reversed[$index] = $instance;
        }

        $array = $reversed;

        return true;
    }

    /**
     * Emet des messages dans le flux STDERR de niveau WARNING ou ERROR
     *
     * @param string $message Message à afficher dans le STDERR
     * @param array  $args    Elements à introduire dans le message
     * @param int    $level   Niveau d'alerte : 0 = warning, 1 = error
     *
     * @return void
     */
    protected function stderr($message, array $args = [], $level = 1)
    {
        // Connexion aux variables globales
        $color_err = self::OPTIONS['colors']['color_err'];
        $color_war = self::OPTIONS['colors']['color_war'];

        // Traitement en fonction du niveau d'erreur
        $level_str = ($level) ? "ERROR" : "WARNING";
        $color = ($level) ? $color_err : $color_war;

        // Mise en evidence des saisie utilisateur
        $message = $this->highlight($message);
        $message = "[ \e[38;5;{$color}m$level_str\e[0m ] :: $message" . PHP_EOL;

        fwrite($this->pstderr, vsprintf($message, $args));
        if ($level && !$this->noDie) die($level);
    }

    /**
     * Emet des messages dans le flux classique STDOUT
     *
     * @param string $message Message à afficher dans le STDOUT
     * @param array  $arg     Elements à introduire dans le message
     */
    protected function stdout($message, $args = [], $title = 'INFO')
    {
        $options = self::OPTIONS;

        if (!isset($options["silent"])) {
            $message = $this->highlight($message);
            $message = "[ $title ] :: $message".PHP_EOL;
            fwrite($this->psdtout, vsprintf($message, $args));
        }
    }

}

