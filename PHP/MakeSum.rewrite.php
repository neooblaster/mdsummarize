<?php
class MakeSum
{
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
             * Mise à jour du fichier
             */
            // @TODO : >>> ICI >>>>>>> PARSE
            if ($debug) {
                $this->stdout("1%s", ["In debug mode, no changes are applied to files."], "DEBUG");
            }
            else {
                file_put_contents($path, $text);
            }
        }

        return true;
    }

}

