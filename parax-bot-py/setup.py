from setuptools import setup, find_packages

setup(
    name="parax-bot-sdk",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "websockets>=10.0",
        "aiohttp>=3.8.0",
    ],
    author="Parax Team",
    author_email="support@paraxweb.app",
    description="Official Python SDK for Parax Bots",
    long_description=open("README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/ParaxWebApp/parax-bot-py",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.7",
)
