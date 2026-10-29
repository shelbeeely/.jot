#!/bin/sh
# After the .deb installs or removes Jot: let file managers learn (or forget) the .jot types and their icon.
update-mime-database /usr/share/mime >/dev/null 2>&1 || true
gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor >/dev/null 2>&1 || true
update-desktop-database -q /usr/share/applications >/dev/null 2>&1 || true
exit 0
