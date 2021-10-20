SHELL := /bin/bash

IMAGE_NAME := nervos/godwoken-polyman-prebuilds

build-push:
	@read -p "Please Enter New Image Tag: " VERSION ; \
	docker build . -t ${IMAGE_NAME}:$$VERSION ; \
	docker push ${IMAGE_NAME}:$$VERSION

build-test-image:
	docker build . -t ${IMAGE_NAME}:latest-test

test:
	make build-test-image
	make test-jq
	make test-polyman

test-jq:
	docker run --rm ${IMAGE_NAME}:latest-test /bin/bash -c "jq -V"

test-polyman:
	docker run --rm -v `pwd`/godwoken-polyman:/app ${IMAGE_NAME}:latest-test /bin/bash -c "cp -r godwoken-polyman/node_modules app/node_modules"
	cd godwoken-polyman && yarn check --verify-tree
