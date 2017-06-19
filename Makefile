.PHONY: default first-time deploy-beta

default:
	yarn
	# this fixes a weird naming collision issue
	rm -rf node_modules/react-native-svg/node_modules/react-native
	gulp

deploy-beta:
	rsync -vrc web/* root@morpheus.arisgames.org:/var/www/html/scratch/siftr-native --exclude-from rsync-exclude

run-android:
	# https://github.com/marcshilling/react-native-image-picker/issues/241
	cd android && ./gradlew clean
	react-native run-android
